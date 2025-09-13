from curl_cffi import requests
# from golike_manager import GolikeManager

class InstagramManager:
    def __init__(self, account):
        self.account = account
        # print(self.account)
        self.session = requests.Session()   
        self.headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'cache-control': 'max-age=0',
            'dpr': '1',
            'priority': 'u=0, i',
            'sec-ch-prefers-color-scheme': 'dark',
            'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            'sec-ch-ua-full-version-list': '"Not;A=Brand";v="99.0.0.0", "Google Chrome";v="139.0.7258.155", "Chromium";v="139.0.7258.155"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"10.0.0"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'viewport-width': '1455',
            'cookie': f'{self.account[0]["instagram_accounts"][-1]["cookie"]}',
        }

        self.headers_golike = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'authorization': f'Bearer {self.account[0]["authorization"]}',
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
    def check_user(self):
        try:
            response = self.session.get('https://www.instagram.com/', headers=self.headers).text
            self.username = response.split('{"user":{"username":"')[1].split('"')[0]
        except:
            return False, 'Cookie không hợp lệ', None

        response = self.session.get('https://gateway.golike.net/api/instagram-account',
                                    headers=self.headers_golike,
                                    impersonate='safari_ios').json()
        self.id_golike = response['data']

        # check local data
        for ig_acc in self.account[0]['instagram_accounts']:
            if ig_acc['instagram_username'] == self.username:
                return False, 'Trùng tài khoản trên hệ thống', self.username

        # check golike
        for ig_golike in self.id_golike:
            if ig_golike['instagram_username'] == self.username:
                self.account[0]['instagram_accounts'][-1]['golike_account_id'] = ig_golike['user_id']
                self.account[0]['instagram_accounts'][-1]['id_account_golike'] = ig_golike['id']
                self.account[0]['instagram_accounts'][-1]['golike_username'] = ig_golike['username']
                return True, 'Trùng tài khoản', self.username

        return False, 'Tài khoản không tồn tại trên golike', self.username



    def check_account(self):
        ok, message, username = self.check_user()
        if ok:
            self.account[0]['instagram_accounts'][-1]['instagram_username'] = username
            
            return True, self.account
        else:
            self.account[0]['instagram_accounts'].pop()
            return False, message

