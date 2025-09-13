import requests
from web.src_py.mission_golike import Get_golike
# from mission_golike import Get_golike
import threading
from time import sleep

class GolikeInstagram: 
    def __init__(self,data):
        self.data = data
        self.stop_account = self.data['stop_account']
        self.delay = self.data['delay']
        self.taskType = self.data['taskType']
        self.switch_account = self.data['switch_account']
        self.is_running = True
        self.price_after_cost = 0
        
        # Thêm biến để track stats
        self.total_missions_completed = 0
        self.total_earnings = 0

        self.session = requests.Session()   
        self.headers = {
            'accept': '*/*',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'content-type': 'application/x-www-form-urlencoded',
            'origin': 'https://www.instagram.com',
            'priority': 'u=1, i',
            'referer': 'https://www.instagram.com/wanderingrosebavi/',
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
            # 'x-csrftoken': 'BQovDG109ZsMlYE4Tmso4PDFfTC7Omai',
            'x-fb-friendly-name': 'usePolarisFollowMutation',
            'x-fb-lsd': 'TFWTkrycaAZVX6mhbrW3C-',
            'x-ig-app-id': '936619743392459',
            'x-root-field-name': 'xdt_create_friendship',
            # 'cookie': 'datr=7wiSaF5gTAciXPWcWtaAnnsy; ig_did=798E266F-94DA-4CC5-B33C-93620DACFB2B; mid=aJII7wALAAEfjXsTGOStRTzXQ0QX; ig_nrcb=1; ps_l=1; ps_n=1; oo=v1; dpr=1; wd=841x773; ds_user_id=76194190151; csrftoken=BtzqJuP8zqIlOovQfRscK5WlhFPLMK2t; sessionid=76194190151%3AfzkBhNFMTQ0x4L%3A6%3AAYhTus6bPdDbFeZVNnxEdYdS3smM6j1qtyE-2AbuBg; rur="HIL\\05476194190151\\0541789242287:01feb4eec2a3eccd0531c5556e6cf89ccad27b177b2b222f037c3745beaa1c062ee78f99"',
        }


    def send_stats_update(self):
        """Gửi cập nhật stats về backend"""
        try:
            import eel
            stats_data = {
                'total_nvu': self.total_missions_completed,
                'total_balance': self.total_earnings,
                'completed_missions': self.total_missions_completed,
                'total_earnings': self.total_earnings
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

    def get_homepage(self):
        response = requests.get('https://www.instagram.com/', headers=self.headers).text
        self.jazoest = response.split('jazoest=')[1].split('"')[0]
        self.userID = response.split('"userID":"')[1].split('"')[0]
        self.fb_dtsg = response.split('"dtsg":{"token":"')[1].split('"')[0]
        print(self.jazoest, self.userID, self.fb_dtsg)

    def follow_user(self,user_id):
        self.get_homepage()
        self.headers['x-root-field-name'] = f'xdt_api__v1__friendships__create__target_user_id'
        data = {
            'av': self.userID,
            'fb_dtsg': self.fb_dtsg,
            'fb_api_caller_class': 'RelayModern',
            'fb_api_req_friendly_name': 'usePolarisFollowMutation',
            'variables': '{"target_user_id":"'+str(user_id)+'","container_module":"profile","nav_chain":"PolarisDesktopPostRoot:postPage:1:via_cold_start,PolarisProfilePostsTabRoot:profilePage:3:unexpected"}',
            'doc_id': '9740159112729312',
        }
        response = self.session.post('https://www.instagram.com/graphql/query', headers=self.headers, data=data)
        return response.json()
    
    def like_post(self,media_id):
        self.get_homepage()
        self.headers['x-root-field-name'] = f'xdt_mark_media_like'
        print(self.userID, self.fb_dtsg, self.jazoest, media_id)
        data = {
            'av': self.userID,
            'fb_dtsg': self.fb_dtsg,
            'jazoest': self.jazoest,
            'fb_api_caller_class': 'RelayModern',
            'fb_api_req_friendly_name': 'usePolarisLikeMediaLikeMutation',
            'variables': '{"media_id":"'+str(media_id)+'","container_module":"single_post"}',
            'doc_id': '23951234354462179',
        }
        response = self.session.post('https://www.instagram.com/graphql/query', headers=self.headers, data=data)
        return response.json()
    
    def comment_post(self,media_id,text):
        self.get_homepage()

        data = {
            'comment_text': text,
            'jazoest': self.fb_dtsg,
        }
        response = self.session.post(
            f'https://www.instagram.com/api/v1/web/comments/{media_id}/add/',
            headers=self.headers,
            data=data,
        )

    def run_mission(self, data_account):
        try:
            import eel
            # Gửi thông báo bắt đầu
            eel.update_runner_log(f"🚀 Bắt đầu chạy tài khoản GoLike: {data_account['name_account']} (@{data_account['username_account']})")
            
        except:
            pass
        
        number_mission = 0
        account_earnings = 0  # Track earnings cho tài khoản này
        
        while number_mission < self.stop_account and self.is_running:
            if not self.is_running:
                try:
                    eel.update_runner_log(f"⏹️ Đã dừng tài khoản {data_account['username_account']}")
                except:
                    pass
                break
                
            for account_ig in data_account['instagram_accounts']:
                if not self.is_running:
                    break
                
                self.headers['x-csrftoken'] = account_ig['cookie'].split('csrftoken=')[1].split(';')[0]
                self.headers['cookie'] = account_ig['cookie']
                
                try:
                    eel.update_runner_log(f"📱 Đang sử dụng tài khoản Instagram: @{account_ig['username']}")
                except:
                    pass
                
                for i in range(self.switch_account):
                    if not self.is_running:
                        break
                        
                    try:
                        mission_golike = Get_golike(data_account['authorization'], account_ig['id_account_golike']).get_instagram()
                        try:
                            task_icons = {'follow': '👥', 'like': '❤️', 'comment': '💬'}
                            task_names = {'follow': 'Follow', 'like': 'Like', 'comment': 'Comment'}
                            icon = task_icons.get(mission_golike['type'], '⚡')
                            task_name = task_names.get(mission_golike['type'], mission_golike['type'])
                        except:
                            pass
                        
                        # Thực hiện nhiệm vụ
                        if mission_golike['type'] == 'follow':
                            status = self.follow_user(mission_golike['object_id'])
                        elif mission_golike['type'] == 'like':
                            status = self.like_post(mission_golike['object_id'])
                        elif mission_golike['type'] == 'comment':
                            Get_golike(data_account['authorization'], account_ig['id_account_golike']).skip_job(mission_golike['id_nv'], account_ig['id_account_golike'], mission_golike['object_id'], mission_golike['type'])
                            status = {'status': False}
                            try:
                                eel.update_runner_log(f"⏭️ Bỏ qua nhiệm vụ comment (chưa hỗ trợ)")
                            except:
                                pass
                            continue
                        
                        # Kiểm tra kết quả
                        if status.get('status') == 'ok':
                            status_complete = Get_golike(data_account['authorization'], account_ig['id_account_golike']).complete_job(mission_golike['id_nv'], account_ig['id_account_golike'])
                            
                            if status_complete:
                                # Cập nhật stats
                                mission_earning = int(mission_golike['price_after_cost'])
                                self.price_after_cost += mission_earning
                                account_earnings += mission_earning
                                number_mission += 1
                                self.total_missions_completed += 1
                                self.total_earnings += mission_earning
                                
                                # Thông báo thành công
                                try:
                                    eel.update_runner_log(f"✅ Hoàn thành nhiệm vụ #{number_mission} - {task_name} 💰 Thu nhập: +{mission_earning}đ | Tổng: {self.price_after_cost}đ")
                                except:
                                    pass
                                
                                # Gửi cập nhật stats
                                self.send_stats_update()
                                
                                sleep(self.delay)
                            else:
                                Get_golike(data_account['authorization'], account_ig['id_account_golike']).skip_job(mission_golike['id_nv'], account_ig['id_account_golike'], mission_golike['object_id'], mission_golike['type'])
                                try:
                                    eel.update_runner_log(f"❌ Lỗi khi hoàn thành nhiệm vụ - Đã bỏ qua")
                                except:
                                    pass
                        else:
                            try:
                                eel.update_runner_log(f"⚠️ Lỗi khi thực hiện nhiệm vụ: {status}")
                            except:
                                pass
                    
                    except Exception as e:
                        try:
                            eel.update_runner_log(f"💥 Lỗi xử lý nhiệm vụ: {str(e)}")
                        except:
                            pass
                        continue
                
                try:
                    eel.update_runner_log(f"🔄 Đổi sang tài khoản Instagram tiếp theo")
                except:
                    pass
        
        # Thông báo kết thúc
        try:
            if self.is_running:
                eel.update_runner_log(f"🏁 Hoàn thành {number_mission} nhiệm vụ cho tài khoản {data_account['username_account']}")
                eel.update_runner_log(f"💎 Tổng thu nhập tài khoản này: {account_earnings}đ")
            else:
                eel.update_runner_log(f"⏹️ Đã dừng tài khoản {data_account['username_account']} tại nhiệm vụ #{number_mission}")
        except:
            pass
        
        # Gửi cập nhật cuối cùng
        self.send_stats_update()

    def thread(self):
        scan_threads = []
        self.price_after_cost = 0
        self.total_missions_completed = 0
        self.total_earnings = 0
        
        try:
            import eel
            eel.update_runner_log(f"🎯 Khởi động runner với {len(self.data['golike_accounts'])} tài khoản GoLike")
        except:
            pass
            
        for i in self.data['golike_accounts']:
            if not self.is_running:
                break
            t = threading.Thread(target=self.run_mission, args=(i,))
            t.start()
            scan_threads.append(t)
        
        # Chờ tất cả threads kết thúc
        for t in scan_threads:
            t.join()
        
        try:
            import eel
            if self.is_running:
                eel.update_runner_log(f"🎉 Đã hoàn thành tất cả tài khoản!")
                eel.update_runner_log(f"📈 Tổng kết: {self.total_missions_completed} NVU - {self.total_earnings}đ")
            else:
                eel.update_runner_log(f"🛑 Đã dừng runner theo yêu cầu!")
            
            # Gửi cập nhật stats cuối cùng
            self.send_stats_update()
        except:
            pass
# if __name__ == "__main__":
#     ig=GolikeInstagram({'delay': 5, 'taskType': 'all', 'threadCount': 3, 'switch_account': 5, 'stop_account': 5, 'golike_accounts': [{'id': '1757586321016', 'authorization': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9nYXRld2F5LmdvbGlrZS5uZXRcL2FwaVwvbG9naW4iLCJpYXQiOjE3NTc0MTQyOTMsImV4cCI6MTc4ODk1MDI5MywibmJmIjoxNzU3NDE0MjkzLCJqdGkiOiJlVDBqUTl5UndmRkxyaTBaIiwic3ViIjozMDc5MDE2LCJwcnYiOiJiOTEyNzk5NzhmMTFhYTdiYzU2NzA0ODdmZmYwMWUyMjgyNTNmZTQ4In0.fp-APrTEYr2i514R06UQCXwrjvNvCnzEtG_UnjgYFt0', 'id_account': 3079016, 'username_account': 'shinsad1', 'name_account': 'võ lê triều lân', 'status': 'ready', 'pending_coin': 450, 'total_coin': 0, 'instagram_accounts': [ {'id': '17576127775270vihm47a6', 'username': 'mariolka1767', 'id_account_golike': 800638, 'golike_account_id': 3079016, 'status': 'active', 'cookie': 'datr=7wiSaF5gTAciXPWcWtaAnnsy; ig_did=798E266F-94DA-4CC5-B33C-93620DACFB2B; mid=aJII7wALAAEfjXsTGOStRTzXQ0QX; ig_nrcb=1; ps_l=1; ps_n=1; oo=v1; wd=1455x919; csrftoken=BeYUUp5W6ZiXnbi68qbj5FruRjy0uEzf; ds_user_id=77132834057; sessionid=77132834057%3AXgLyVeJnVb8UuF%3A7%3AAYi7z9VmKXrdamUGVEbJAhPBGq-1Oy8AGkT7ssLNAA; rur="VLL\\05477132834057\\0541789142321:01fedaa2e0deb40fd540ed6f1c57eaf95e3e19e055eaa95ed9614013c7650982b82beec4"', 'proxy': '192.168.1.100:8080:username:password', 'created_at': '2025-09-11T17:46:17.527Z'}]}]})
#     print(ig.thread())