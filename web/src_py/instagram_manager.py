from curl_cffi import requests
import os
import json
import threading
import time
import sys
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import sleep
# ❌ KHÔNG redirect stdout/stderr - sẽ làm hỏng Eel!
# Chỉ cần bảo vệ flush() method trong hàm log()
# try:
#     json_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../data/manager-golike.json'))
# except:
#     try:
#         json_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../data/manager-golike.json'))
#     except:
#         json_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../data/manager-golike.json'))
json_path = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../data/manager-golike.json'))

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
        """Follow account để verify - LUÔN RETURN DICT"""
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
            sleep(5)
            return result if result else {'status': 'error', 'message': 'Empty response'}
            
        except Exception as e:
            self.log(f"[FOLLOW] ERROR: {str(e)}")
            return {'status': 'error', 'message': str(e)}


    def add_account_golike(self, username):
        """Thêm account vào GoLike - LUÔN RETURN DICT"""
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
            return result if result else {'status': 'error', 'message': 'Empty response'}
            
        except Exception as e:
            self.log(f"[GOLIKE] ERROR: {str(e)}")
            return {'status': 'error', 'message': str(e)}

   

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
        """
        Cập nhật hoặc thêm mới Instagram account - TRÁNH DUPLICATE
        """
        golike_id = self.account['golike_account_id']
        
        self.log(f"[UPDATE] Username: {username}, GoLike ID: {id_golike}")
        
        for data_manager in self.data_manager_golike:
            if data_manager['id_account'] == golike_id:
                if 'instagram_accounts' not in data_manager:
                    data_manager['instagram_accounts'] = []
                
                # ✅ CHECK DUPLICATE - Tìm theo ID GoLike hoặc username
                found = False
                for ig_acc in data_manager['instagram_accounts']:
                    # Kiểm tra theo id_account_golike HOẶC username
                    if (ig_acc.get('id_account_golike') == id_golike or 
                        ig_acc.get('instagram_username', '').lower() == username.lower()):
                        
                        # UPDATE - không tạo mới
                        ig_acc['id_account_golike'] = id_golike  # Đảm bảo ID đúng
                        ig_acc['instagram_username'] = username
                        ig_acc['cookie'] = cookie
                        ig_acc['proxy'] = proxy
                        ig_acc['last_check'] = datetime.now().isoformat()
                        ig_acc['status'] = 'active'
                        found = True
                        self.log(f"[UPDATE] ✅ UPDATED existing: {username}")
                        break
                
                # Nếu chưa có thì mới thêm
                if not found:
                    new_account = {
                        'id': f"ig_{int(time.time() * 1000)}_{id_golike}",  # Unique ID
                        'id_account_golike': id_golike,
                        'instagram_username': username,
                        'status': 'active',
                        'created_at': datetime.now().isoformat(),
                        'last_check': datetime.now().isoformat(),
                        'cookie': cookie,
                        'proxy': proxy,
                        'checked': False  # Mặc định chưa check
                    }
                    data_manager['instagram_accounts'].append(new_account)
                    self.log(f"[UPDATE] ✅ ADDED new: {username}")
                
                # Lưu file ngay lập tức
                try:
                    with open(json_path, 'w', encoding='utf-8') as f:
                        json.dump(self.data_manager_golike, f, ensure_ascii=False, indent=4)
                    self.log(f"[UPDATE] 💾 Saved to file")
                except Exception as e:
                    self.log(f"[UPDATE] ❌ Error saving file: {str(e)}")
                    return False
                
                return True
        
        self.log(f"[UPDATE] ❌ Không tìm thấy GoLike account: {golike_id}")
        return False

    def check_user(self, account_data):
        """Check 1 Instagram account - LUÔN RETURN DICT"""
        session = requests.Session()
        
        # Default error result
        default_error = {
            'success': False,
            'status': 'error',
            'message': 'Unknown error',
            'username': None,
            'cookie': '',
            'proxy': ''
        }
        
        try:
            # Validate input
            if not account_data or not isinstance(account_data, dict):
                self.log("[CHECK USER] ❌ Invalid account_data!")
                return {
                    **default_error,
                    'message': 'Dữ liệu account không hợp lệ'
                }
            
            cookie = account_data.get('cookie', '').strip()
            proxy = account_data.get('proxy', '').strip()
            
            self.log(f"\n{'='*60}")
            self.log(f"[CHECK USER] Bắt đầu check account")
            self.log(f"[CHECK USER] Cookie: {cookie[:50]}..." if cookie else "[CHECK USER] Cookie: EMPTY")
            self.log(f"[CHECK USER] Proxy: {proxy}")
            self.log(f"{'='*60}")
            
            if not cookie:
                self.log("[CHECK USER] ❌ Cookie rỗng!")
                return {
                    **default_error,
                    'message': 'Cookie rỗng',
                    'proxy': proxy
                }
            
            proxies = self.setup_proxy(proxy)
            
            self.headers['cookie'] = cookie
            
            # Extract csrftoken safely
            try:
                if 'csrftoken=' in cookie:
                    self.headers['x-csrftoken'] = cookie.split('csrftoken=')[1].split(';')[0]
            except:
                self.log("[CHECK USER] ⚠️ Không tìm thấy csrftoken")
            
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
                    **default_error,
                    'message': f'HTTP {response.status_code}',
                    'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                    'proxy': proxy
                }
            
            text = response.text
            
            if '"username":"' not in text:
                self.log("[CHECK USER] ❌ Cookie DIE hoặc cần challenge!")
                return {
                    **default_error,
                    'status': 'die',
                    'message': 'Cookie die hoặc cần challenge',
                    'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                    'proxy': proxy
                }

            username = text.split('"username":"')[1].split('"')[0]
            self.log(f"[CHECK USER] ✅ Username: {username}")
            
            # Check trên GoLike
            exists, id_golike = self.check_account_golike(username)
            
            # Retry logic
            max_retries = 3
            for attempt in range(max_retries):
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
                    self.log(f"[CHECK USER] Attempt {attempt + 1}/{max_retries}: Follow và thêm mới...")
                    follow_result = self.follow_account(proxy)
                    
                    if follow_result.get('status') == 'error':
                        self.log(f"[CHECK USER] ❌ Lỗi follow (attempt {attempt + 1})!")
                        if attempt < max_retries - 1:
                            time.sleep(2)
                            continue
                        else:
                            return {
                                **default_error,
                                'message': 'Lỗi follow account sau 3 lần thử',
                                'username': username,
                                'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                                'proxy': proxy
                            }
                    
                    time.sleep(1)
                    
                    result = self.add_account_golike(username)
                    if result.get('status') == 200:
                        id_golike = result.get('data', {}).get('id')
                        if id_golike:
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
                            self.log(f"[CHECK USER] ❌ Không nhận được ID từ GoLike")
                    else:
                        self.log(f"[CHECK USER] ❌ GoLike Error (attempt {attempt + 1}): {result}")
                        if attempt < max_retries - 1:
                            time.sleep(2)
                            # Re-check existence
                            exists, id_golike = self.check_account_golike(username)
                    
            # Nếu hết retry vẫn lỗi
            return {
                **default_error,
                'message': 'Không thể thêm vào GoLike sau 3 lần thử',
                'username': username,
                'cookie': cookie[:50] + '...' if len(cookie) > 50 else cookie,
                'proxy': proxy
            }
                    
        except Exception as e:
            self.log(f"[CHECK USER] ❌ EXCEPTION: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return {
                **default_error,
                'message': f'Exception: {str(e)}',
                'username': None,
                'cookie': account_data.get('cookie', '')[:50] + '...' if account_data.get('cookie') and len(account_data.get('cookie', '')) > 50 else account_data.get('cookie', ''),
                'proxy': account_data.get('proxy', '')
            }
    def thread_check_account(self, max_workers=1):
        """
        Check nhiều accounts TUẦN TỰ với error handling an toàn
        """
        accounts = self.account.get('new_instagram_accounts', [])
        
        if not accounts:
            self.log("[THREAD] ❌ Không có accounts để check!")
            return []
        
        self.log(f"\n{'='*60}")
        self.log(f"[THREAD] Bắt đầu check {len(accounts)} accounts")
        self.log(f"{'='*60}\n")
        
        results = []
        
        for idx, acc in enumerate(accounts, 1):
            result = None  # Initialize
            
            try:
                self.log(f"\n{'─'*60}")
                self.log(f"[{idx}/{len(accounts)}] Checking account...")
                self.log(f"{'─'*60}")
                
                # Validate account data
                if not acc or not isinstance(acc, dict):
                    self.log(f"[THREAD] ❌ Invalid account data at index {idx}")
                    result = {
                        'success': False,
                        'status': 'error',
                        'message': 'Dữ liệu account không hợp lệ',
                        'username': None,
                        'cookie': '',
                        'proxy': ''
                    }
                else:
                    # Check account
                    result = self.check_user(acc)
                
                # Validate result
                if result is None or not isinstance(result, dict):
                    self.log(f"[THREAD] ⚠️ check_user returned None/invalid, creating default error")
                    result = {
                        'success': False,
                        'status': 'error',
                        'message': 'check_user returned invalid result',
                        'username': None,
                        'cookie': acc.get('cookie', '')[:30] + '...' if acc.get('cookie') else '',
                        'proxy': acc.get('proxy', '')
                    }
                
                results.append(result)
                
                # Log kết quả
                status_icon = "✅" if result.get('success') else "❌"
                self.log(f"{status_icon} Result: {result.get('status')} - {result.get('username', 'N/A')}")
                self.log(f"   Message: {result.get('message')}")
                
                # GỬI PROGRESS VỀ FRONTEND
                try:
                    import eel
                    progress_data = {
                        'success': result.get('success', False),
                        'status': result.get('status', 'error'),
                        'username': result.get('username', 'N/A'),
                        'message': result.get('message', 'Unknown'),
                        'current': idx,
                        'total': len(accounts),
                        'cookie': result.get('cookie', '')[:30] + '...',
                        'proxy': result.get('proxy', '')
                    }
                    eel.update_instagram_check_progress(progress_data)
                    self.log(f"   📡 Progress sent to frontend: {idx}/{len(accounts)}")
                except Exception as e:
                    self.log(f"   ⚠️ Cannot send progress to frontend: {str(e)}")
                
                # Delay giữa các accounts
                if idx < len(accounts):
                    time.sleep(2)
                    
            except Exception as e:
                self.log(f"[THREAD] ❌ Critical error processing account {idx}: {str(e)}")
                import traceback
                traceback.print_exc()
                
                # Create safe error result
                error_result = {
                    'success': False,
                    'status': 'error',
                    'message': f'Critical error: {str(e)}',
                    'username': None,
                    'cookie': acc.get('cookie', '')[:30] + '...' if isinstance(acc, dict) and acc.get('cookie') else '',
                    'proxy': acc.get('proxy', '') if isinstance(acc, dict) else ''
                }
                results.append(error_result)
                
                # Gửi error về frontend
                try:
                    import eel
                    eel.update_instagram_check_progress(error_result)
                except:
                    pass
        
        # Final validation - remove any None values
        results = [r for r in results if r is not None and isinstance(r, dict)]
        
        self.log(f"\n{'='*60}")
        self.log(f"[THREAD] ✅ HOÀN THÀNH! Đã check {len(results)}/{len(accounts)} accounts")
        
        # Safe counting
        try:
            success_count = len([r for r in results if r and r.get('success')])
            failed_count = len([r for r in results if r and not r.get('success')])
            self.log(f"   Success: {success_count}")
            self.log(f"   Failed: {failed_count}")
        except Exception as e:
            self.log(f"   ⚠️ Error counting results: {str(e)}")
        
        self.log(f"{'='*60}\n")
        
        return results