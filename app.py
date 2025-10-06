import eel
import json
import os
import sqlite3
from datetime import datetime
import requests
import time
import threading
from web.src_py.golike_manager import GolikeManager 
from web.src_py.golike_instagram import GolikeInstagram
from web.src_py.instagram_manager import InstagramManager
from web.src_py.instagram_cookie_checker import InstagramCookieChecker
from web.src_py.key import Check_key
# Khởi tạo Eel
eel.init('web')

# Global variable để lưu dữ liệu runner
runner_data = None
is_runner_active = False
runner_stats = {
    'total_nvu': 0,
    'total_balance': 0,
    'running_count': 0,
    'completed_missions': 0,
    'total_earnings': 0
}


@eel.expose
def check_instagram_cookie_single(cookie_data):
    """
    Kiểm tra 1 cookie Instagram
    
    Args:
        cookie_data: dict hoặc JSON string chứa:
            - ig_id: ID của Instagram account
            - cookie: Cookie string
            - proxy: (optional) Proxy string
    
    Returns:
        dict: Kết quả check cookie
    """
    try:
        # Parse nếu là string
        if isinstance(cookie_data, str):
            data = json.loads(cookie_data)
        else:
            data = cookie_data
        
        ig_id = data.get('ig_id', '')
        cookie = data.get('cookie', '')
        proxy = data.get('proxy', None)
        
        print(f"\n{'='*50}")
        print(f"Checking Instagram Cookie")
        print(f"IG ID: {ig_id}")
        print(f"Cookie length: {len(cookie)}")
        print(f"Proxy: {proxy if proxy else 'No proxy'}")
        print(f"{'='*50}\n")
        
        if not cookie:
            return {
                'success': False,
                'ig_id': ig_id,
                'status': 'error',
                'message': 'Cookie không được để trống',
                'checked_at': datetime.now().isoformat()
            }
        
        # Khởi tạo checker
        checker = InstagramCookieChecker(cookie, proxy)
        
        # Check cookie
        result = checker.check_user()
        
        # Thêm ig_id vào result
        result['ig_id'] = ig_id
        
        print(f"\n✅ Check completed for IG ID: {ig_id}")
        print(f"Status: {result.get('status')}")
        print(f"Username: {result.get('username', 'N/A')}")
        print(f"Message: {result.get('message')}\n")
        
        return result
        
    except Exception as e:
        print(f"❌ Error in check_instagram_cookie_single: {str(e)}")
        return {
            'success': False,
            'ig_id': cookie_data.get('ig_id', '') if isinstance(cookie_data, dict) else '',
            'status': 'error',
            'message': f'Lỗi: {str(e)}',
            'checked_at': datetime.now().isoformat()
        }


@eel.expose
def check_instagram_cookies_batch(cookies_data):
    """
    Kiểm tra nhiều cookies Instagram cùng lúc
    
    Args:
        cookies_data: list of dicts hoặc JSON string, mỗi dict chứa:
            - ig_id: ID của Instagram account
            - cookie: Cookie string
            - proxy: (optional) Proxy string
    
    Returns:
        dict: Kết quả tổng hợp
    """
    try:
        # Parse nếu là string
        if isinstance(cookies_data, str):
            data = json.loads(cookies_data)
        else:
            data = cookies_data
        
        print(f"\n{'='*50}")
        print(f"🚀 Starting Batch Cookie Check")
        print(f"Total cookies to check: {len(data)}")
        print(f"{'='*50}\n")
        
        results = []
        live_count = 0
        die_count = 0
        error_count = 0
        
        for index, item in enumerate(data, 1):
            ig_id = item.get('ig_id', '')
            cookie = item.get('cookie', '')
            proxy = item.get('proxy', None)
            
            print(f"\n[{index}/{len(data)}] Checking IG ID: {ig_id}")
            
            if not cookie:
                result = {
                    'success': False,
                    'ig_id': ig_id,
                    'status': 'error',
                    'message': 'Cookie trống',
                    'checked_at': datetime.now().isoformat()
                }
                error_count += 1
            else:
                # Check cookie
                checker = InstagramCookieChecker(cookie, proxy)
                result = checker.check_user()
                result['ig_id'] = ig_id
                
                # Count status
                if result.get('status') == 'live':
                    live_count += 1
                    print(f"   ✅ LIVE - {result.get('username', 'N/A')}")
                elif result.get('status') == 'die':
                    die_count += 1
                    print(f"   ❌ DIE")
                else:
                    error_count += 1
                    print(f"   ⚠️ ERROR")
            
            results.append(result)
            
            # Gửi progress về frontend (nếu có)
            try:
                eel.update_cookie_check_progress({
                    'current': index,
                    'total': len(data),
                    'ig_id': ig_id,
                    'status': result.get('status'),
                    'live_count': live_count,
                    'die_count': die_count,
                    'error_count': error_count
                })
            except:
                pass  # Frontend có thể chưa kết nối
            
            # Delay nhỏ giữa các request để tránh spam
            if index < len(data):
                import time
                time.sleep(1)
        
        print(f"\n{'='*50}")
        print(f"✅ Batch Check Completed")
        print(f"Total: {len(results)}")
        print(f"Live: {live_count}")
        print(f"Die: {die_count}")
        print(f"Error: {error_count}")
        print(f"{'='*50}\n")
        
        return {
            'success': True,
            'results': results,
            'total': len(results),
            'live_count': live_count,
            'die_count': die_count,
            'error_count': error_count,
            'checked_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error in check_instagram_cookies_batch: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'results': [],
            'total': 0,
            'live_count': 0,
            'die_count': 0,
            'error_count': 0
        }


@eel.expose
def update_instagram_cookie_status(file_path, ig_id, check_result):
    """
    Cập nhật kết quả check cookie vào file JSON
    
    Args:
        file_path: Đường dẫn file JSON
        ig_id: ID của Instagram account
        check_result: Kết quả check cookie
    
    Returns:
        dict: Success status
    """
    try:
        # Đọc file hiện tại
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}
        
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Tìm và cập nhật Instagram account
        updated = False
        for golike_acc in data:
            if 'instagram_accounts' in golike_acc:
                for ig_acc in golike_acc['instagram_accounts']:
                    if ig_acc.get('id') == ig_id:
                        # Cập nhật status
                        ig_acc['status'] = 'active' if check_result.get('status') == 'live' else 'error'
                        ig_acc['last_check'] = check_result.get('checked_at')
                        
                        # Cập nhật username nếu có
                        if check_result.get('username'):
                            ig_acc['instagram_username'] = check_result.get('username')
                        
                        # Thêm thông tin chi tiết
                        ig_acc['check_message'] = check_result.get('message', '')
                        
                        updated = True
                        break
            
            if updated:
                break
        
        if not updated:
            return {"success": False, "error": "Không tìm thấy Instagram account"}
        
        # Lưu lại file
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        
        print(f"✅ Updated cookie status for IG ID: {ig_id}")
        
        return {"success": True, "data": data}
        
    except Exception as e:
        print(f"❌ Error updating cookie status: {str(e)}")
        return {"success": False, "error": str(e)}



@eel.expose
def read_json_file(file_path):
    try:
        if not os.path.exists(file_path):
            return {"success": True, "data": []}
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@eel.expose
def write_json_file(file_path, data):
    try:
        updated_accounts = []
        print(data)
        for acc in data:
            try:
                acc_new = GolikeManager(acc).get_me_account()
                updated_accounts.append(acc_new)
            except:
                pass

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(updated_accounts, f, ensure_ascii=False, indent=4)

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
@eel.expose
def write_json_file_groups(file_path, data):
    try:
        updated_accounts = []
        print(data)
        print(file_path)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
@eel.expose
def delete_instagram_account(file_path, data):
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@eel.expose
def add_proxy_instagram_account(file_path, data):
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@eel.expose
def update_instagram_accounts(file_path, data):
    try:
        print("Dữ liệu nhận được để thêm tài khoản:", data)
        check_account, data = InstagramManager(data).check_account()
        print(data)
        if not check_account:
            return {"success": False, "error": data}
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@eel.expose  
def update_accounts_from_api(file_path, data):
    try:
        updated_accounts = []
        print("Updating accounts from API...")
        
        for acc in data:
            try:
                acc_new = GolikeManager(acc).get_me_account()
                updated_accounts.append(acc_new)
            except Exception as e:
                print(f"Error updating account {acc.get('id_account', 'unknown')}: {e}")
                updated_accounts.append(acc)

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(updated_accounts, f, ensure_ascii=False, indent=4)

        return {"success": True, "data": updated_accounts}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Global variables để lưu dữ liệu runner
runner_data = None
is_runner_active = False
current_runner_instance = None  # Thêm biến để lưu instance hiện tại

@eel.expose
def receive_runner_data(json_data):
    """
    Nhận dữ liệu JSON từ frontend và bắt đầu runner
    """
    global runner_data, is_runner_active, current_runner_instance, runner_stats
    
    try:
        # Parse JSON data
        data = json.loads(json_data)
        runner_data = data
        is_runner_active = True
        
        # Reset stats khi bắt đầu mới
        runner_stats = {
            'total_nvu': 0,
            'total_balance': 0,
            'running_count': sum(len(acc.get('instagram_accounts', [])) 
                               for acc in data.get('golike_accounts', [])),
            'completed_missions': 0,
            'total_earnings': 0
        }
        print(data)
        # Tạo instance GolikeInstagram và lưu reference
        current_runner_instance = GolikeInstagram(data)
        
        # Gửi thông báo về frontend
        eel.update_runner_log("🔥 Đã nhận dữ liệu từ frontend - ")
        
        # Gửi stats ban đầu
        try:
            eel.update_runner_stats(runner_stats)
        except:
            pass
        
        # Chạy runner trong thread để không block
        runner_thread = threading.Thread(target=current_runner_instance.thread)
        runner_thread.daemon = True
        runner_thread.start()
        
        return {"success": True, "message": "Đã bắt đầu runner thành công"}

    except json.JSONDecodeError as e:
        print(f"Lỗi parse JSON: {str(e)}")
        return {"success": False, "error": f"Lỗi parse JSON: {str(e)}"}
    except Exception as e:
        print(f"Lỗi receive_runner_data: {str(e)}")
        return {"success": False, "error": str(e)}
@eel.expose
def get_runner_stats():
    """Lấy stats hiện tại của runner"""
    global runner_stats, is_runner_active, current_runner_instance
    
    try:
        # Cập nhật running count từ instance hiện tại
        actual_running_count = 0
        if current_runner_instance and hasattr(current_runner_instance, 'is_running'):
            if current_runner_instance.is_running:
                # Đếm số thread đang chạy (có thể từ data hoặc estimate)
                if runner_data and 'golike_accounts' in runner_data:
                    actual_running_count = sum(len(acc.get('instagram_accounts', [])) 
                                             for acc in runner_data['golike_accounts'])
        
        runner_stats['running_count'] = actual_running_count if is_runner_active else 0
        
        return {
            "success": True,
            "stats": runner_stats,
            "is_active": is_runner_active and current_runner_instance is not None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
    
@eel.expose 
def update_runner_stats(stats_data):
    """Cập nhật stats từ runner"""
    global runner_stats
    
    try:
        if isinstance(stats_data, str):
            stats_data = json.loads(stats_data)
        
        # Cập nhật các giá trị stats
        for key, value in stats_data.items():
            if key in runner_stats:
                runner_stats[key] = value
        
        # Gửi update về frontend
        try:
            eel.update_runner_stats(runner_stats)
        except:
            pass  # Frontend có thể không connected
        
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
    
@eel.expose
def reset_runner_stats():
    """Reset tất cả stats về 0"""
    global runner_stats
    
    runner_stats = {
        'total_nvu': 0,
        'total_balance': 0, 
        'running_count': 0,
        'completed_missions': 0,
        'total_earnings': 0
    }
    
    # Gửi update về frontend
    try:
        eel.update_runner_stats(runner_stats)
    except:
        pass
    
    return {"success": True}
@eel.expose
def stop_runner():
    """Dừng runner"""
    global is_runner_active, runner_data, current_runner_instance, runner_stats
    
    try:
        is_runner_active = False
        
        # Gọi method stop() của instance hiện tại nếu tồn tại
        if current_runner_instance:
            current_runner_instance.stop()
            current_runner_instance = None
        
        runner_data = None
        
        # Reset running count
        runner_stats['running_count'] = 0
        
        # Gửi stats update về frontend
        try:
            eel.update_runner_stats(runner_stats)
        except:
            pass
        
        eel.update_runner_log("✅ Lệnh dừng đã được gửi thành công")
        return {"success": True, "message": "Đã dừng runner"}
        
    except Exception as e:
        print(f"Lỗi stop_runner: {str(e)}")
        return {"success": False, "error": str(e)}

@eel.expose
def get_runner_status():
    """Lấy trạng thái runner hiện tại"""
    global is_runner_active, runner_data, current_runner_instance
    
    # Kiểm tra xem runner có đang chạy thực sự không
    actual_running = (
        is_runner_active and 
        current_runner_instance is not None and 
        current_runner_instance.is_running
    )
    
    return {
        "success": True,
        "is_active": actual_running,
        "account_count": len(runner_data.get('golike_accounts', [])) if runner_data else 0,
        "has_instance": current_runner_instance is not None
    }

@eel.expose
def main_check_key(key):
    with open(r'data/version_client.json', 'r', encoding="utf-8-sig") as f:
        version = json.load(f)
    statuscheckkey = Check_key().check_update(key, version['version_client'])
    if statuscheckkey['data']:
        with open('data/key.json', "w", encoding="utf-8") as f:
            json.dump({'key':key}, f, ensure_ascii=False, indent=4)
        eel.start('index.html', size=(1200, 800))
    return statuscheckkey

# Chạy ứng dụng
if __name__ == '__main__':
    # if Check_key().checK_update():
    #     eel.start('index.html', size=(1200, 800), port=8080)
    # else:
    #     pass
    try:
        with open(r'data/key.json', "r", encoding="utf-8") as f:
            key_data = json.load(f)   # load xong là đóng file
        with open(r'data/version_client.json', 'r', encoding="utf-8-sig") as versiondata:
            version = json.load(versiondata)
        status_checkkey = Check_key().check_update(key_data['key'], version)
        if status_checkkey['data'] == True:
            eel.start('index.html', size=(1200, 800), port=6060)
        else:
            os.remove('data/key.json')
            eel.start('key.html', size=(400, 600), port=6060)

    except Exception as e:
        print(e)
        eel.start('key.html', size=(400, 600), port=6060)

    # eel.start('key.html', size=(1200, 800), port=6060)