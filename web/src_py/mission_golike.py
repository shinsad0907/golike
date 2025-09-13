from curl_cffi import requests

class Get_golike:
    def __init__(self, authorization, id_account):
        self.authorization = authorization
        self.id_account = id_account
        self.headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5',
            'authorization': 'Bearer '+self.authorization,
            'content-type': 'application/json;charset=utf-8',
            'origin': 'https://app.golike.net',
            'priority': 'u=1, i',
            'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            't': 'VFZSak1VNTZXVE5OVkZVMFRWRTlQUT09',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        }
    def get_instagram(self):
        params = {
            'instagram_account_id': self.id_account,
            'data': 'null',
        }
        response = requests.get('https://gateway.golike.net/api/advertising/publishers/instagram/jobs', impersonate='safari_ios', params=params, headers=self.headers).json()
        return {
            "id_nv": response['data']['id'],
            "package_name": response['data']['package_name'],
            "object_id": response['data']['object_id'],
            "link": response['data']['link'],
            "type": response['data']['type'],
            "price_after_cost": response['data']['price_after_cost'],
        }
    def skip_job(self, id_nv, id_account, object_id, type, platform='instagram'):
        json_data = {
            'description': 'Tôi không muốn làm Job này',
            'users_advertising_id': id_nv,
            'type': 'ads',
            'provider': platform,
            'fb_id': id_account,
            'error_type': 0,
        }
        response = requests.post('https://gateway.golike.net/api/report/send',impersonate='safari_ios', headers=self.headers, json=json_data)

        json_data = {
            'ads_id': id_nv,
            'object_id': object_id,
            'account_id': id_account,
            'type': type,
        }

        response = requests.post(
            'https://gateway.golike.net/api/advertising/publishers/instagram/skip-jobs',
            impersonate='safari_ios',
            headers=self.headers,
            json=json_data,
        ).json()

        return response['skip']
    def complete_job(self, id_nv, id_account):
        json_data = {
            'instagram_users_advertising_id': id_nv,
            'instagram_account_id': id_account,
            'async': True,
            'data': None,
        }

        response = requests.post(
            'https://gateway.golike.net/api/advertising/publishers/instagram/complete-jobs',
            impersonate='safari_ios',
            headers=self.headers,
            json=json_data,
        ).json()
        return response['success']
# from golike_manager import GolikeManager
