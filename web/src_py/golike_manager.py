from curl_cffi import requests

class GolikeManager:
    def __init__(self, account):
        self.account = account
        print(f"Initializing GolikeManager for account: {self.account}")
        auth = self.account['authorization']
        self.headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'authorization': f'Bearer {auth}',
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
    
    def get_me_account(self):
        # Lấy số coin
        get_coin = requests.get(
            'https://gateway.golike.net/api/statistics/report',
            impersonate='safari_ios',
            headers=self.headers
        ).json()

        platform = [
            'facebook', 'instagram', 'tiktok', 'youtube', 'lazada',
            'shopee', 'linkedin', 'twitter', 'review', 'pinterest',
            'threads', 'traffic', 'snapchat'
        ]

        self.pending_coin = 0
        self.total_coin = 0

        for pf in platform:
            pf_data = get_coin.get(pf)  # dùng .get() tránh KeyError
            if pf_data:
                self.pending_coin += pf_data.get('pending_coin', 0)
                self.total_coin += pf_data.get('hold_coin', 0)

        print(f"Pending: {self.pending_coin}, Total: {self.total_coin}")

        # Lấy thông tin account
        info_account = requests.get(
            'https://gateway.golike.net/api/users/me',
            impersonate='safari_ios',
            headers=self.headers
        ).json()

        self.id_account = info_account['data'].get('id')
        self.email_account = info_account['data'].get('email')
        self.name_account = info_account['data'].get('name')
        self.username_account = info_account['data'].get('username')

        info_instagram = requests.get(
            'https://gateway.golike.net/api/instagram-account',
            impersonate='safari_ios',
            headers=self.headers
        ).json()

        for ig in info_instagram.get('data', []):
            self.account['instagram_accounts'].append({
                'id': ig.get('instagram_id'),
                'golike_account_id': self.id_account,
                'golike_username': self.username_account,
                'id_account_golike': ig.get('id'),
                'instagram_username': ig.get('instagram_username'),
                "status": "active",
                "created_at": "2025-09-11T08:00:59.690Z",
                "last_check": None,
                "cookie": ''
            })

        # Ghi vào dict account
        self.account['pending_coin'] = self.pending_coin
        self.account['total_coin'] = self.total_coin
        self.account['id_account'] = self.id_account
        self.account['email_account'] = self.email_account
        self.account['name_account'] = self.name_account
        self.account['username_account'] = self.username_account
        self.account['status'] = 'ready'

        return self.account
    

# if __name__ == "__main__":
#     GolikeManager({
#         'authorization': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9nYXRld2F5LmdvbGlrZS5uZXRcL2FwaVwvbG9naW4iLCJpYXQiOjE3NTc0MTQyOTMsImV4cCI6MTc4ODk1MDI5MywibmJmIjoxNzU3NDE0MjkzLCJqdGkiOiJlVDBqUTl5UndmRkxyaTBaIiwic3ViIjozMDc5MDE2LCJwcnYiOiJiOTEyNzk5NzhmMTFhYTdiYzU2NzA0ODdmZmYwMWUyMjgyNTNmZTQ4In0.fp-APrTEYr2i514R06UQCXwrjvNvCnzEtG_UnjgYFt0'
#     }).get_me_account()

