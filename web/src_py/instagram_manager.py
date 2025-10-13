from curl_cffi import requests
import os
import json
import threading
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

json_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../data/manager-golike.json'))

class InstagramManager:
    def __init__(self, account):
        self.account = account
        
        with open(json_path, 'r', encoding='utf-8') as f:
            self.data_manager_golike = json.load(f)
        
        self.headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Chromium";v="140", "Google Chrome";v="140"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
        }

        self.headers_golike = {
            'accept': 'application/json, text/plain, */*',
            'authorization': f'Bearer {self.account["golike_authorization"]}',
            'content-type': 'application/json;charset=utf-8',
            'origin': 'https://app.golike.net',
            't': 'VFZSak1VNTZWWGxPVkdzeFRuYzlQUT09',
            'user-agent': 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        }

    def setup_proxy(self, proxy):
        """Setup proxy"""
        if not proxy or proxy.strip() == '':
            return None
        
        try:
            proxy = proxy.strip()
            
            if proxy.startswith('http://') or proxy.startswith('https://'):
                return {'http': proxy, 'https': proxy}
            
            parts = proxy.split(':')
            if len(parts) == 4:
                ip, port, user, password = parts
                proxy_url = f"http://{user}:{password}@{ip}:{port}"
            elif len(parts) == 2:
                ip, port = parts
                proxy_url = f"http://{ip}:{port}"
            else:
                return None
            
            return {'http': proxy_url, 'https': proxy_url}
        except:
            return None

    def follow_account(self, proxy):
        """Follow account để verify"""
        session = requests.Session()
        proxies = self.setup_proxy(proxy)
        
        try:
            response = session.get(self.link_verify_follow, 
                                 headers=self.headers, 
                                 timeout=15, 
                                 proxies=proxies,
                                 impersonate='chrome110')
            text = response.text
            
            jazoest = text.split('jazoest=')[1].split('"')[0]
            userID = text.split('"userID":"')[1].split('"')[0]
            fb_dtsg = text.split('"dtsg":{"token":"')[1].split('"')[0]
            id_follow = text.split('self.link_verify_follow')[1].split('"')[0]
            
            headers_copy = self.headers.copy()
            headers_copy['x-root-field-name'] = 'xdt_api__v1__friendships__create__target_user_id'
    
            
            data = {
                'av': userID,
                'fb_dtsg': fb_dtsg,
                'fb_api_caller_class': 'RelayModern',
                'fb_api_req_friendly_name': 'usePolarisFollowMutation',
                'variables': f'{{"target_user_id":"{id_follow}","container_module":"profile"}}',
                'doc_id': '9740159112729312',
            }
            
            response = session.post('https://www.instagram.com/graphql/query', 
                                  headers=headers_copy, 
                                  data=data, 
                                  timeout=15, 
                                  proxies=proxies,
                                  impersonate='chrome110')
            print(response.json())
            return response.json()
        except:
            return {'status': 'error'}

    def add_account_golike(self, username):
        """Thêm account vào GoLike"""
        json_data = {'object_id': username}
        
        try:
            response = requests.post('https://gateway.golike.net/api/instagram-account/verify-account', 
                                   headers=self.headers_golike, 
                                   json=json_data,
                                   timeout=15,
                                   impersonate='chrome110')
            print(response.json())
            return response.json()
        except:
            return {'status': 'error'}

    def check_account_golike(self, username):
        """Check account đã tồn tại trên GoLike chưa"""
        try:
            response = requests.get('https://gateway.golike.net/api/instagram-account',
                                  headers=self.headers_golike,
                                  timeout=15,
                                  impersonate='chrome110').json()
            
            self.id_golike = response.get('data', [])
            self.link_verify_follow = response.get('link_verify_follow', '')

            for account in self.id_golike:
                if account.get('instagram_username', '').lower() == username.lower():
                    return True, account.get('id')
            
            return False, None
        except:
            return False, None

    def update_cookie(self, username, cookie, proxy, id_golike):
        """Cập nhật hoặc thêm mới Instagram account vào file"""
        golike_id = self.account['golike_account_id']
        
        for data_manager in self.data_manager_golike:
            if data_manager['id_account'] == golike_id:
                if 'instagram_accounts' not in data_manager:
                    data_manager['instagram_accounts'] = []
                
                # Check xem username đã tồn tại chưa
                found = False
                for ig_acc in data_manager['instagram_accounts']:
                    if ig_acc['instagram_username'] == username:
                        # Update
                        ig_acc['cookie'] = cookie
                        ig_acc['proxy'] = proxy
                        ig_acc['last_check'] = datetime.now().isoformat()
                        ig_acc['status'] = 'active'
                        found = True
                        break
                
                # Nếu chưa có thì thêm mới
                if not found:
                    data_manager['instagram_accounts'].append({
                        'id': f"{int(time.time())}_{len(data_manager['instagram_accounts'])}",
                        'id_account_golike': id_golike,
                        'instagram_username': username,
                        'status': 'active',
                        'created_at': datetime.now().isoformat(),
                        'last_check': datetime.now().isoformat(),
                        'cookie': cookie,
                        'proxy': proxy
                    })
                
                # Lưu file
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(self.data_manager_golike, f, ensure_ascii=False, indent=4)
                
                return True
        
        return False

    def check_user(self, account_data):
        """Check 1 Instagram account"""
        session = requests.Session()
        
        try:
            cookie = account_data.get('cookie', '').strip()
            proxy = account_data.get('proxy', '').strip()
            
            if not cookie:
                return False, 'Cookie rỗng', None
            
            proxies = self.setup_proxy(proxy)
            
            headers = self.headers.copy()
            headers['cookie'] = cookie
            
            response = session.get('https://www.instagram.com/', 
                                 headers=headers, 
                                 proxies=proxies,
                                 timeout=15,
                                 impersonate='chrome110')
            
            if response.status_code != 200:
                return False, f'HTTP {response.status_code}', None
            
            text = response.text
            
            if '"username":"' not in text:
                print("Cookie die or challenge required")
                return False, 'Cookie die', None

            
            username = text.split('"username":"')[1].split('"')[0]
            
            # Check trên GoLike
            exists, id_golike = self.check_account_golike(username)
            
            if exists:
                # Update cookie
                self.update_cookie(username, cookie, proxy, id_golike)
                return True, 'Updated', username
            else:
                # Follow và thêm mới
                self.follow_account(proxy)
                time.sleep(1)
                
                result = self.add_account_golike(username)
                if result.get('status') == 200:
                    id_golike = result.get('data', {}).get('id')
                    self.update_cookie(username, cookie, proxy, id_golike)
                    return True, 'Added', username
                else:
                    return False, 'GoLike error', username
                    
        except Exception as e:
            print(f"Error checking user: {e}")
            return False, str(e), None

    def thread_check_account(self, max_workers=3):
        """Check nhiều accounts song song"""
        accounts = self.account.get('new_instagram_accounts', [])
        
        if not accounts:
            return []
        
        results = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_account = {
                executor.submit(self.check_user, acc): acc 
                for acc in accounts
            }
            
            for future in as_completed(future_to_account):
                try:
                    success, message, username = future.result()
                    results.append({
                        'success': success,
                        'username': username,
                        'message': message
                    })
                except:
                    results.append({'success': False})
                
                time.sleep(0.5)
        
        return results