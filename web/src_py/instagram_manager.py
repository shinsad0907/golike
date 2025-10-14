from curl_cffi import requests
import os
import json
import threading
import time
import sys
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# ❌ KHÔNG redirect stdout/stderr - sẽ làm hỏng Eel!
# Chỉ cần bảo vệ flush() method trong hàm log()

json_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data/manager-golike.json'))

class InstagramManager:
    def __init__(self, account):
        self.account = account
        print(f"InstagramManager init with account: {self.account}")
        with open(json_path, 'r', encoding='utf-8') as f:
            self.data_manager_golike = json.load(f)
        
        self.headers = {
            'accept': '*/*',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'content-type': 'application/x-www-form-urlencoded',
            'origin': 'https://www.instagram.com',
            'priority': 'u=1, i',
            'referer': 'https://www.instagram.com/',
            'sec-ch-prefers-color-scheme': 'dark',
            'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            'sec-ch-ua-full-version-list': '"Not;A=Brand";v="99.0.0.0", "Google Chrome";v="139.0.7258.155", "Chromium";v="139.0.7258.155"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"10.0.0"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'x-asbd-id': '359341',
            'x-bloks-version-id': '64f02abc184fb0d9135db12e85e451a3be71c64f7231c320a09e7df0ef1bdf6d',
            'x-fb-friendly-name': 'usePolarisFollowMutation',
            'x-fb-lsd': 'TFWTkrycaAZVX6mhbrW3C-',
            'x-ig-app-id': '936619743392459',
        }
        self.headers_golike = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'authorization': f'Bearer {self.account["golike_authorization"]}',
            'content-type': 'application/json;charset=utf-8',
            'origin': 'https://app.golike.net',
            'priority': 'u=1, i',
            'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            't': 'VFZSak1VNTZWWGxPVkdzeFRuYzlQUT09',
            'user-agent': 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        }

    def log(self, message, flush=True):
        """Helper function để print với flush - Safe cho EXE"""
        try:
            print(message)
            if flush and sys.stdout is not None:
                sys.stdout.flush()
        except:
            pass  # Ignore flush errors trong EXE mode

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
            self.log(f"[FOLLOW] Bắt đầu follow account...")
            
            response = session.get(self.link_verify_follow, 
                                 headers=self.headers, 
                                 timeout=15, 
                                 proxies=proxies,
                                 impersonate='chrome110')
            text = response.text
            
            jazoest = text.split('jazoest=')[1].split('"')[0]
            userID = text.split('"userID":"')[1].split('"')[0]
            fb_dtsg = text.split('"dtsg":{"token":"')[1].split('"')[0]
            id_follow = text.split('"page_id":"profilePage_')[1].split('"')[0]
            self.log(f"[FOLLOW] UserID: {userID}, ID Follow: {id_follow}")
            
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
            
            result = response.json()
            self.log(f"[FOLLOW] Result: {result}")
            return result
            
        except Exception as e:
            self.log(f"[FOLLOW] ERROR: {str(e)}")
            return {'status': 'error'}

    def add_account_golike(self, username):
        """Thêm account vào GoLike"""
        json_data = {'object_id': username}
        
        try:
            self.log(f"[GOLIKE] Thêm account: {username}")
            
            response = requests.post('https://gateway.golike.net/api/instagram-account/verify-account', 
                                   headers=self.headers_golike, 
                                   json=json_data,
                                   timeout=15,
                                   impersonate='chrome110')
            
            result = response.json()
            self.log(f"[GOLIKE] Response: {result}")
            return result
            
        except Exception as e:
            self.log(f"[GOLIKE] ERROR: {str(e)}")
            return {'status': 'error'}

    def check_account_golike(self, username):
        """Check account đã tồn tại trên GoLike chưa"""
        try:
            self.log(f"[CHECK GOLIKE] Checking: {username}")
            
            response = requests.get('https://gateway.golike.net/api/instagram-account',
                                  headers=self.headers_golike,
                                  timeout=15,
                                  impersonate='chrome110').json()
            
            self.id_golike = response.get('data', [])
            self.link_verify_follow = response.get('link_verify_follow', '')

            for account in self.id_golike:
                if account.get('instagram_username', '').lower() == username.lower():
                    self.log(f"[CHECK GOLIKE] ✅ Đã tồn tại: {username}")
                    return True, account.get('id')
            
            self.log(f"[CHECK GOLIKE] ❌ Chưa tồn tại: {username}")
            return False, None
            
        except Exception as e:
            self.log(f"[CHECK GOLIKE] ERROR: {str(e)}")
            return False, None

    def update_cookie(self, username, cookie, proxy, id_golike):
        """Cập nhật hoặc thêm mới Instagram account vào file"""
        golike_id = self.account['golike_account_id']
        
        self.log(f"[UPDATE] Username: {username}, GoLike ID: {id_golike}")
        
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
                        self.log(f"[UPDATE] ✅ Đã cập nhật: {username}")
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
                    self.log(f"[UPDATE] ✅ Đã thêm mới: {username}")
                
                # Lưu file
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(self.data_manager_golike, f, ensure_ascii=False, indent=4)
                
                return True
        
        self.log(f"[UPDATE] ❌ Không tìm thấy GoLike account: {golike_id}")
        return False

    def check_user(self, account_data):
        """Check 1 Instagram account"""
        session = requests.Session()
        
        try:
            cookie = account_data.get('cookie', '').strip()
            proxy = account_data.get('proxy', '').strip()
            
            self.log(f"\n{'='*60}")
            self.log(f"[CHECK USER] Bắt đầu check account")
            self.log(f"[CHECK USER] Cookie: {cookie[:50]}...")
            self.log(f"[CHECK USER] Proxy: {proxy}")
            self.log(f"{'='*60}")
            
            if not cookie:
                self.log("[CHECK USER] ❌ Cookie rỗng!")
                return {
                    'success': False,
                    'status': 'error',
                    'message': 'Cookie rỗng',
                    'username': None,
                    'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                    'proxy': proxy
                }
            
            proxies = self.setup_proxy(proxy)
            
            self.headers['cookie'] = cookie
            self.headers['x-csrftoken'] = cookie.split('csrftoken=')[1].split(';')[0]
            
            self.log("[CHECK USER] Đang request Instagram...")
            
            response = session.get('https://www.instagram.com/',
                                headers=self.headers,
                                proxies=proxies,
                                timeout=15,
                                impersonate='chrome110')
            
            self.log(f"[CHECK USER] HTTP Status: {response.status_code}")
            
            if response.status_code != 200:
                self.log(f"[CHECK USER] ❌ HTTP Error {response.status_code}")
                return {
                    'success': False,
                    'status': 'error',
                    'message': f'HTTP {response.status_code}',
                    'username': None,
                    'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                    'proxy': proxy
                }
            
            text = response.text
            
            if '"username":"' not in text:
                self.log("[CHECK USER] ❌ Cookie DIE hoặc cần challenge!")
                return {
                    'success': False,
                    'status': 'die',
                    'message': 'Cookie die hoặc cần challenge',
                    'username': None,
                    'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                    'proxy': proxy
                }

            username = text.split('"username":"')[1].split('"')[0]
            self.log(f"[CHECK USER] ✅ Username: {username}")
            
            # Check trên GoLike
            exists, id_golike = self.check_account_golike(username)
            
            if exists:
                # Update cookie
                self.update_cookie(username, cookie, proxy, id_golike)
                self.log(f"[CHECK USER] ✅ HOÀN THÀNH - Updated: {username}")
                return {
                    'success': True,
                    'status': 'updated',
                    'message': 'Đã cập nhật',
                    'username': username,
                    'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                    'proxy': proxy
                }
            else:
                # Follow và thêm mới
                self.log(f"[CHECK USER] Cần follow và thêm mới...")
                follow_result = self.follow_account(proxy)
                
                if follow_result.get('status') == 'error':
                    self.log(f"[CHECK USER] ❌ Lỗi follow!")
                    return {
                        'success': False,
                        'status': 'error',
                        'message': 'Lỗi follow account',
                        'username': username,
                        'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                        'proxy': proxy
                    }
                
                time.sleep(1)
                
                result = self.add_account_golike(username)
                if result.get('status') == 200:
                    id_golike = result.get('data', {}).get('id')
                    self.update_cookie(username, cookie, proxy, id_golike)
                    self.log(f"[CHECK USER] ✅ HOÀN THÀNH - Added: {username}")
                    return {
                        'success': True,
                        'status': 'added',
                        'message': 'Đã thêm mới',
                        'username': username,
                        'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                        'proxy': proxy
                    }
                else:
                    self.log(f"[CHECK USER] ❌ GoLike Error: {result}")
                    return {
                        'success': False,
                        'status': 'error',
                        'message': f'GoLike error: {result.get("message", "Unknown")}',
                        'username': username,
                        'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                        'proxy': proxy
                    }
                    
        except Exception as e:
            self.log(f"[CHECK USER] ❌ EXCEPTION: {str(e)}")
            return {
                'success': False,
                'status': 'error',
                'message': str(e),
                'username': None,
                'cookie': account_data.get('cookie', '')[:50] + '...' if len(account_data.get('cookie', '')) > 50 else account_data.get('cookie', ''),
                'proxy': account_data.get('proxy', '')
            }

    def thread_check_account(self, max_workers=3):
        """Check nhiều accounts song song"""
        accounts = self.account.get('new_instagram_accounts', [])
        
        if not accounts:
            self.log("[THREAD] ❌ Không có accounts để check!")
            return []
        
        self.log(f"\n{'='*60}")
        self.log(f"[THREAD] Bắt đầu check {len(accounts)} accounts với {max_workers} workers")
        self.log(f"{'='*60}\n")
        
        results = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_account = {
                executor.submit(self.check_user, acc): acc 
                for acc in accounts
            }
            
            for idx, future in enumerate(as_completed(future_to_account), 1):
                try:
                    result = future.result()
                    results.append(result)
                    
                    self.log(f"\n[THREAD] Progress: {idx}/{len(accounts)}")
                    self.log(f"[THREAD] Result: {result['status']} - {result.get('username', 'N/A')}")
                    
                    # Gửi progress về frontend
                    try:
                        import eel
                        eel.update_instagram_check_progress(result)
                    except:
                        pass
                        
                except Exception as e:
                    self.log(f"[THREAD] ❌ Error: {str(e)}")
                    results.append({
                        'success': False,
                        'status': 'error',
                        'message': str(e),
                        'username': None
                    })
                
                time.sleep(0.5)
        
        self.log(f"\n{'='*60}")
        self.log(f"[THREAD] ✅ HOÀN THÀNH! Đã check xong {len(results)} accounts")
        self.log(f"{'='*60}\n")
        
        return results