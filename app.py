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
# Chạy ứng dụng
if __name__ == '__main__':
    if Check_key().checK_update():
        eel.start('index.html', size=(1200, 800), port=8080)
    else:
        pass