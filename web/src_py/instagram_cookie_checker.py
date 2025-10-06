"""
Instagram Cookie Checker
Kiểm tra tính hợp lệ của Instagram cookies
"""
import requests
import json
from datetime import datetime
import time


class InstagramCookieChecker:
    def __init__(self, cookie, proxy=None):
        self.cookie = cookie
        self.proxy = proxy
        self.session = requests.Session()
        
        # Headers giống như class InstagramManager của bạn
        self.headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
        }
        
        self.username = None
        self.status = 'unknown'
        
    def parse_cookie(self):
        """Parse cookie string thành dict"""
        cookie_dict = {}
        try:
            for item in self.cookie.split(';'):
                item = item.strip()
                if '=' in item:
                    key, value = item.split('=', 1)
                    cookie_dict[key.strip()] = value.strip()
            return cookie_dict
        except Exception as e:
            print(f"Error parsing cookie: {e}")
            return {}
    
    def setup_proxy(self):
        """Setup proxy nếu có"""
        if self.proxy:
            try:
                # Format: IP:PORT:USER:PASS hoặc IP:PORT
                parts = self.proxy.split(':')
                if len(parts) == 4:
                    ip, port, user, password = parts
                    proxy_url = f"http://{user}:{password}@{ip}:{port}"
                elif len(parts) == 2:
                    ip, port = parts
                    proxy_url = f"http://{ip}:{port}"
                else:
                    return None
                
                return {
                    'http': proxy_url,
                    'https': proxy_url
                }
            except Exception as e:
                print(f"Error setting up proxy: {e}")
                return None
        return None
    
    def check_user(self):
        """
        Kiểm tra cookie bằng cách truy cập Instagram homepage
        Dựa trên method check_user() của bạn
        """
        try:
            # Parse và set cookies
            cookie_dict = self.parse_cookie()
            if not cookie_dict:
                return {
                    'success': False,
                    'status': 'die',
                    'username': None,
                    'message': 'Cookie không hợp lệ hoặc rỗng',
                    'checked_at': datetime.now().isoformat()
                }
            
            for key, value in cookie_dict.items():
                self.session.cookies.set(key, value, domain='.instagram.com')
            
            # Setup proxy nếu có
            proxies = self.setup_proxy()
            
            # Request tới Instagram
            response = self.session.get(
                'https://www.instagram.com/',
                headers=self.headers,
                proxies=proxies,
                timeout=15,
                allow_redirects=True
            )
            
            print(f"Response status: {response.status_code}")
            
            # Check response
            if response.status_code == 200:
                response_text = response.text
                
                # Tìm username trong response (giống code của bạn)
                try:
                    if '"username":"' in response_text:
                        self.username = response_text.split('"username":"')[1].split('"')[0]
                        self.status = 'live'
                        
                        print(f"✅ Cookie LIVE - Username: {self.username}")
                        
                        return {
                            'success': True,
                            'status': 'live',
                            'username': self.username,
                            'message': f'Cookie LIVE - Username: {self.username}',
                            'checked_at': datetime.now().isoformat()
                        }
                    else:
                        # Kiểm tra các trường hợp khác
                        if 'login' in response.url.lower() or 'challenge' in response_text:
                            self.status = 'die'
                            return {
                                'success': True,
                                'status': 'die',
                                'username': None,
                                'message': 'Cookie DIE - Yêu cầu đăng nhập lại',
                                'checked_at': datetime.now().isoformat()
                            }
                        else:
                            self.status = 'die'
                            return {
                                'success': True,
                                'status': 'die',
                                'username': None,
                                'message': 'Cookie DIE - Không tìm thấy username',
                                'checked_at': datetime.now().isoformat()
                            }
                            
                except Exception as e:
                    print(f"Error parsing username: {e}")
                    self.status = 'die'
                    return {
                        'success': True,
                        'status': 'die',
                        'username': None,
                        'message': f'Cookie DIE - Lỗi parse: {str(e)}',
                        'checked_at': datetime.now().isoformat()
                    }
            
            elif response.status_code in [302, 301]:
                # Redirect - có thể là login page
                self.status = 'die'
                return {
                    'success': True,
                    'status': 'die',
                    'username': None,
                    'message': f'Cookie DIE - Redirect đến {response.url}',
                    'checked_at': datetime.now().isoformat()
                }
            
            else:
                self.status = 'die'
                return {
                    'success': True,
                    'status': 'die',
                    'username': None,
                    'message': f'Cookie DIE - HTTP {response.status_code}',
                    'checked_at': datetime.now().isoformat()
                }
                
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'status': 'error',
                'username': None,
                'message': 'Timeout - Không thể kết nối Instagram',
                'checked_at': datetime.now().isoformat()
            }
        except requests.exceptions.ProxyError:
            return {
                'success': False,
                'status': 'error',
                'username': None,
                'message': 'Lỗi Proxy - Không thể kết nối qua proxy',
                'checked_at': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error checking cookie: {e}")
            return {
                'success': False,
                'status': 'error',
                'username': None,
                'message': f'Lỗi: {str(e)}',
                'checked_at': datetime.now().isoformat()
            }


# Test function
