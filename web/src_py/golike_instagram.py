import requests
from web.src_py.mission_golike import Get_golike
import threading
from time import sleep

class GolikeInstagram: 
    def __init__(self, data):
        self.data = data
        self.stop_account = self.data['stop_account']
        self.delay = self.data['delay']
        self.taskType = self.data['taskType']
        self.switch_account = self.data['switch_account']
        self.threadCountCookie = self.data.get('threadCountCookie', 1)  # ✅ THÊM THREAD COUNT CHO COOKIE
        self.is_running = True
        self.price_after_cost = 0
        
        self.total_missions_completed = 0
        self.total_earnings = 0

        # Session cache cho mỗi IG account
        self.session_cache = {}
        self.exhausted_ig_accounts = set()
        
        # ✅ LOCK ĐỂ ĐỒNG BỘ KHI NHIỀU THREAD CẬP NHẬT STATS
        self.stats_lock = threading.Lock()
        
        self.base_headers = {
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

    def send_stats_update(self):
        """Gửi cập nhật stats về backend (thread-safe)"""
        try:
            import eel
            with self.stats_lock:
                # Đếm số account đang chạy (chưa exhausted)
                running_count = 0
                for golike_acc in self.data['golike_accounts']:
                    active_ig = [
                        ig for ig in golike_acc['instagram_accounts']
                        if ig['id_account_golike'] not in self.exhausted_ig_accounts
                    ]
                    running_count += len(active_ig)
                
                stats_data = {
                    'totalNVU': self.total_missions_completed,
                    'totalBalance': self.total_earnings,
                    'runningCount': running_count,
                    'completedMissions': self.total_missions_completed,
                    'totalEarnings': self.total_earnings
                }
            eel.update_runner_stats(stats_data)
        except:
            pass

    def stop(self):
        """Dừng tất cả các runner"""
        self.is_running = False
        try:
            import eel
            eel.update_runner_log("🛑 Đã nhận lệnh dừng - Đang dừng tất cả tài khoản...")
        except:
            pass

    def parse_proxy(self, proxy_string):
        """Parse proxy string thành dict cho requests"""
        if not proxy_string or proxy_string.strip() == '':
            return None
        
        try:
            parts = proxy_string.strip().split(':')
            if len(parts) < 2:
                return None
            
            ip = parts[0]
            port = parts[1]
            
            if len(parts) >= 4:
                username = parts[2]
                password = parts[3]
                proxy_url = f"http://{username}:{password}@{ip}:{port}"
            else:
                proxy_url = f"http://{ip}:{port}"
            
            return {
                'http': proxy_url,
                'https': proxy_url
            }
        except Exception as e:
            print(f"Error parsing proxy {proxy_string}: {e}")
            return None

    def check_proxy_location(self, session, proxy_string=None):
        """Kiểm tra IP và location của proxy"""
        try:
            response = session.get('https://api.ipify.org?format=json', timeout=10)
            ip_data = response.json()
            current_ip = ip_data.get('ip', 'Unknown')
            
            try:
                loc_response = session.get(f'https://ipapi.co/{current_ip}/json/', timeout=10)
                location_data = loc_response.json()
                
                country = location_data.get('country_name', 'Unknown')
                city = location_data.get('city', 'Unknown')
                region = location_data.get('region', 'Unknown')
                
                proxy_info = {
                    'ip': current_ip,
                    'country': country,
                    'city': city,
                    'region': region,
                    'proxy_string': proxy_string or 'No Proxy'
                }
                
                return proxy_info
                
            except Exception as e:
                proxy_info = {
                    'ip': current_ip,
                    'country': 'Unknown',
                    'city': 'Unknown',
                    'region': 'Unknown',
                    'proxy_string': proxy_string or 'No Proxy'
                }
                return proxy_info
                
        except Exception as e:
            return {
                'ip': 'Unknown',
                'country': 'Unknown',
                'city': 'Unknown',
                'region': 'Unknown',
                'proxy_string': proxy_string or 'No Proxy',
                'error': str(e)
            }

    def get_or_create_session(self, ig_account_id, proxy_string=None):
        """Lấy hoặc tạo session mới cho IG account với proxy (thread-safe)"""
        cache_key = f"{ig_account_id}_{proxy_string or 'no_proxy'}"
        
        if cache_key not in self.session_cache:
            session = requests.Session()
            
            if proxy_string:
                proxies = self.parse_proxy(proxy_string)
                if proxies:
                    session.proxies.update(proxies)
                    print(f"✅ Session created with proxy: {proxy_string}")
            
            self.session_cache[cache_key] = {
                'session': session,
                'homepage_data': None,
                'last_used': None,
                'proxy_checked': False,
                'proxy_info': None
            }
        
        return self.session_cache[cache_key]

    def get_homepage(self, session_data, ig_account):
        """Get homepage data và cache lại"""
        if not self.is_running:
            return None
            
        if session_data['homepage_data'] and session_data['last_used']:
            import time
            if time.time() - session_data['last_used'] < 300:
                return session_data['homepage_data']
        
        session = session_data['session']
        headers = self.base_headers.copy()
        headers['cookie'] = ig_account['cookie']
        headers['x-csrftoken'] = ig_account['cookie'].split('csrftoken=')[1].split(';')[0]
        
        try:
            response = session.get('https://www.instagram.com/', headers=headers, timeout=10)
            
            if not self.is_running:
                return None
                
            text = response.text
            
            jazoest = text.split('jazoest=')[1].split('"')[0]
            userID = text.split('"userID":"')[1].split('"')[0]
            fb_dtsg = text.split('"dtsg":{"token":"')[1].split('"')[0]
            
            homepage_data = {
                'jazoest': jazoest,
                'userID': userID,
                'fb_dtsg': fb_dtsg
            }
            
            session_data['homepage_data'] = homepage_data
            import time
            session_data['last_used'] = time.time()
            
            return homepage_data
            
        except Exception as e:
            print(f"❌ Error loading homepage: {e}")
            return None

    def follow_user(self, session, headers, homepage_data, user_id):
        """Follow user với session đã có"""
        if not self.is_running:
            return {'status': 'stopped', 'message': 'Runner stopped'}
            
        headers_copy = headers.copy()
        headers_copy['x-root-field-name'] = 'xdt_api__v1__friendships__create__target_user_id'
        
        data = {
            'av': homepage_data['userID'],
            'fb_dtsg': homepage_data['fb_dtsg'],
            'fb_api_caller_class': 'RelayModern',
            'fb_api_req_friendly_name': 'usePolarisFollowMutation',
            'variables': '{"target_user_id":"'+str(user_id)+'","container_module":"profile","nav_chain":"PolarisDesktopPostRoot:postPage:1:via_cold_start,PolarisProfilePostsTabRoot:profilePage:3:unexpected"}',
            'doc_id': '9740159112729312',
        }
        
        try:
            response = session.post('https://www.instagram.com/graphql/query', 
                                headers=headers_copy, data=data, timeout=10)
            
            if not self.is_running:
                return {'status': 'stopped', 'message': 'Runner stopped'}
                
            return response.json()
        except Exception as e:
            print(f"❌ Error following user: {e}")
            return {'status': 'error', 'message': str(e)}

    def like_post(self, session, headers, homepage_data, media_id):
        """Like post với session đã có"""
        if not self.is_running:
            return {'status': 'stopped', 'message': 'Runner stopped'}
            
        headers_copy = headers.copy()
        headers_copy['x-root-field-name'] = 'xdt_mark_media_like'
        
        data = {
            'av': homepage_data['userID'],
            'fb_dtsg': homepage_data['fb_dtsg'],
            'jazoest': homepage_data['jazoest'],
            'fb_api_caller_class': 'RelayModern',
            'fb_api_req_friendly_name': 'usePolarisLikeMediaLikeMutation',
            'variables': '{"media_id":"'+str(media_id)+'","container_module":"single_post"}',
            'doc_id': '23951234354462179',
        }
        
        try:
            response = session.post('https://www.instagram.com/graphql/query', 
                                headers=headers_copy, data=data, timeout=10)
            
            if not self.is_running:
                return {'status': 'stopped', 'message': 'Runner stopped'}
                
            return response.json()
        except Exception as e:
            print(f"❌ Error liking post: {e}")
            return {'status': 'error', 'message': str(e)}

    def check_all_accounts_exhausted(self, data_account):
        """Kiểm tra xem tất cả IG accounts của GoLike account này đã hết nhiệm vụ chưa"""
        with self.stats_lock:
            total_ig_accounts = len(data_account['instagram_accounts'])
            exhausted_count = sum(
                1 for acc in data_account['instagram_accounts'] 
                if acc['id_account_golike'] in self.exhausted_ig_accounts
            )
        return exhausted_count == total_ig_accounts

    # ✅ HÀM MỚI: CHẠY MISSION CHO 1 INSTAGRAM ACCOUNT (SẼ CHẠY TRONG THREAD)
    def run_instagram_account(self, account_ig, data_account, account_mission_count, account_earnings_dict):
        """Run missions cho 1 Instagram account trong thread riêng"""
        if not self.is_running:
            return
            
        if account_ig['id_account_golike'] in self.exhausted_ig_accounts:
            return
        
        proxy_string = account_ig.get('proxy', None)
        session_data = self.get_or_create_session(account_ig['id'], proxy_string)
        session = session_data['session']
        
        # Check proxy location
        if not session_data['proxy_checked']:
            if not self.is_running:
                return
            proxy_info = self.check_proxy_location(session, proxy_string)
            session_data['proxy_info'] = proxy_info
            session_data['proxy_checked'] = True
        
        headers = self.base_headers.copy()
        headers['x-csrftoken'] = account_ig['cookie'].split('csrftoken=')[1].split(';')[0]
        headers['cookie'] = account_ig['cookie']
        
        if not self.is_running:
            return
        homepage_data = self.get_homepage(session_data, account_ig)
        
        if not homepage_data:
            try:
                import eel
                eel.update_runner_log(f"⚠️ Không thể load homepage cho @{account_ig['username']}")
            except:
                pass
            return
        
        # Chạy missions cho Instagram account này
        for i in range(self.switch_account):
            if not self.is_running:
                break
            
            with self.stats_lock:
                if account_ig['id_account_golike'] in self.exhausted_ig_accounts:
                    break
                
            try:
                if not self.is_running:
                    break
                    
                mission_golike = Get_golike(data_account['authorization'], account_ig['id_account_golike']).get_instagram()
                
                if not self.is_running:
                    break
                
                if int(mission_golike['status']) == 400:
                    with self.stats_lock:
                        self.exhausted_ig_accounts.add(account_ig['id_account_golike'])
                    try:
                        import eel
                        eel.update_runner_log(f"⚠️ @{account_ig['username']} (ID: {account_ig['id_account_golike']}) đã hết nhiệm vụ!")
                    except:
                        pass
                    # ✅ CẬP NHẬT STATS KHI ACCOUNT HẾT NHIỆM VỤ
                    self.send_stats_update()
                    break
                
                if not self.is_running:
                    break
                
                task_icons = {'follow': '👥', 'like': '❤️', 'comment': '💬'}
                task_names = {'follow': 'Follow', 'like': 'Like', 'comment': 'Comment'}
                icon = task_icons.get(mission_golike['type'], '⚡')
                task_name = task_names.get(mission_golike['type'], mission_golike['type'])
                
                # Thực hiện nhiệm vụ
                if mission_golike['type'] == 'follow':
                    status = self.follow_user(session, headers, homepage_data, mission_golike['object_id'])
                elif mission_golike['type'] == 'like':
                    status = self.like_post(session, headers, homepage_data, mission_golike['object_id'])
                elif mission_golike['type'] == 'comment':
                    if not self.is_running:
                        break
                    Get_golike(data_account['authorization'], account_ig['id_account_golike']).skip_job(
                        mission_golike['id_nv'], account_ig['id_account_golike'], 
                        mission_golike['object_id'], mission_golike['type']
                    )
                    try:
                        import eel
                        eel.update_runner_log(f"⏭️ Bỏ qua nhiệm vụ comment (chưa hỗ trợ)")
                    except:
                        pass
                    continue
                
                if not self.is_running:
                    break
                
                if status.get('status') == 'stopped':
                    break
                
                # Kiểm tra kết quả
                if status.get('status') == 'ok':
                    if not self.is_running:
                        break
                        
                    status_complete = Get_golike(data_account['authorization'], account_ig['id_account_golike']).complete_job(
                        mission_golike['id_nv'], account_ig['id_account_golike']
                    )
                    
                    if not self.is_running:
                        break
                    
                    if status_complete:
                        mission_earning = int(mission_golike['price_after_cost'])
                        
                        # ✅ THREAD-SAFE UPDATE STATS
                        with self.stats_lock:
                            self.price_after_cost += mission_earning
                            account_earnings_dict['total'] += mission_earning
                            account_mission_count['count'] += 1
                            self.total_missions_completed += 1
                            self.total_earnings += mission_earning
                        
                        try:
                            import eel
                            proxy_display = ""
                            if session_data['proxy_info']:
                                pi = session_data['proxy_info']
                                proxy_display = f" | 🌍 {pi['ip']} ({pi['country']})"
                            
                            with self.stats_lock:
                                current_mission = account_mission_count['count']
                                current_total = self.price_after_cost
                            
                            eel.update_runner_log(f"[{account_ig['id_account_golike']}] ✅ #{current_mission} - {task_name} 💰 +{mission_earning}đ | Tổng: {current_total}đ{proxy_display}")
                        except:
                            pass
                        
                        self.send_stats_update()
                        
                        if not self.is_running:
                            break
                        
                        # Sleep từng đoạn nhỏ
                        delay_remaining = self.delay
                        while delay_remaining > 0 and self.is_running:
                            sleep_time = min(0.5, delay_remaining)
                            sleep(sleep_time)
                            delay_remaining -= sleep_time
                            if not self.is_running:
                                break
                    else:
                        if not self.is_running:
                            break
                        Get_golike(data_account['authorization'], account_ig['id_account_golike']).skip_job(
                            mission_golike['id_nv'], account_ig['id_account_golike'], 
                            mission_golike['object_id'], mission_golike['type']
                        )
                        try:
                            import eel
                            eel.update_runner_log(f"❌ Lỗi khi hoàn thành nhiệm vụ - Đã bỏ qua")
                        except:
                            pass
                else:
                    try:
                        import eel
                        eel.update_runner_log(f"⚠️ Lỗi khi thực hiện nhiệm vụ: {status}")
                    except:
                        pass
            
            except Exception as e:
                if not self.is_running:
                    break
                try:
                    import eel
                    eel.update_runner_log(f"💥 Lỗi xử lý nhiệm vụ: {str(e)}")
                except:
                    pass
                continue

    # ✅ HÀM SỬA LẠI: CHẠY MISSION CHO GOLIKE ACCOUNT VỚI MULTI-THREAD COOKIE
    def run_mission(self, data_account):
        """Run missions cho một GoLike account với multi-threading cho Instagram accounts"""
        try:
            import eel
            eel.update_runner_log(f"🚀 Bắt đầu GoLike: {data_account['name_account']} - {len(data_account['instagram_accounts'])} IG accounts")
            eel.update_runner_log(f"🧵 Chạy {self.threadCountCookie} luồng cookie đồng thời")
        except:
            pass
        
        # Shared variables cho threads
        account_mission_count = {'count': 0}
        account_earnings_dict = {'total': 0}
        
        while account_mission_count['count'] < self.stop_account and self.is_running:
            if not self.is_running:
                break
            
            if self.check_all_accounts_exhausted(data_account):
                try:
                    import eel
                    eel.update_runner_log(f"🚫 Tất cả IG accounts của {data_account['username_account']} đã hết NVU!")
                except:
                    pass
                break
            
            # ✅ CHẠY INSTAGRAM ACCOUNTS TRONG THREADS
            ig_threads = []
            active_ig_accounts = [
                ig for ig in data_account['instagram_accounts']
                if ig['id_account_golike'] not in self.exhausted_ig_accounts
            ]
            
            if not active_ig_accounts:
                break
            
            # Chia Instagram accounts thành batches theo threadCountCookie
            for i in range(0, len(active_ig_accounts), self.threadCountCookie):
                if not self.is_running:
                    break
                
                batch = active_ig_accounts[i:i + self.threadCountCookie]
                batch_threads = []
                
                for account_ig in batch:
                    if not self.is_running:
                        break
                    
                    t = threading.Thread(
                        target=self.run_instagram_account,
                        args=(account_ig, data_account, account_mission_count, account_earnings_dict)
                    )
                    t.start()
                    batch_threads.append(t)
                
                # Đợi batch này hoàn thành trước khi chạy batch tiếp theo
                for t in batch_threads:
                    t.join()
                
                if not self.is_running:
                    break
        
        try:
            import eel
            if self.is_running:
                eel.update_runner_log(f"🏁 Hoàn thành {account_mission_count['count']} NVU - {data_account['username_account']}")
                eel.update_runner_log(f"💎 Thu nhập tài khoản này: {account_earnings_dict['total']}đ")
            else:
                eel.update_runner_log(f"⏹️ Đã dừng {data_account['username_account']} tại NVU #{account_mission_count['count']}")
        except:
            pass
        
        self.send_stats_update()

    def thread(self):
        """Chạy tất cả GoLike accounts trong threads"""
        scan_threads = []
        self.price_after_cost = 0
        self.total_missions_completed = 0
        self.total_earnings = 0
        
        try:
            import eel
            eel.update_runner_log(f"🎯 Khởi động runner với {len(self.data['golike_accounts'])} GoLike accounts")
            eel.update_runner_log(f"🧵 Mỗi GoLike chạy {self.threadCountCookie} luồng cookie đồng thời")
            # ✅ GỬI STATS BAN ĐẦU
            self.send_stats_update()
        except:
            pass
            
        for i in self.data['golike_accounts']:
            if not self.is_running:
                break
            t = threading.Thread(target=self.run_mission, args=(i,))
            t.start()
            scan_threads.append(t)
        
        for t in scan_threads:
            t.join()
        
        try:
            import eel
            if self.is_running:
                eel.update_runner_log(f"🎉 Hoàn thành tất cả tài khoản!")
                eel.update_runner_log(f"📈 Tổng kết: {self.total_missions_completed} NVU - {self.total_earnings}đ")
            else:
                eel.update_runner_log(f"🛑 Đã dừng runner theo yêu cầu!")
            
            # ✅ GỬI STATS CUỐI CÙNG
            self.send_stats_update()
        except:
            pass