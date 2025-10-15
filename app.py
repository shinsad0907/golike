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

def remove_duplicates_from_data(data):
    """
    Loại bỏ duplicate Instagram accounts dựa trên id
    """
    if not isinstance(data, list):
        return data
    
    for golike_acc in data:
        if 'instagram_accounts' in golike_acc and isinstance(golike_acc['instagram_accounts'], list):
            # Tạo dict để track unique IDs
            seen_ids = {}
            unique_accounts = []
            
            for ig_acc in golike_acc['instagram_accounts']:
                ig_id = ig_acc.get('id')
                if ig_id and ig_id not in seen_ids:
                    seen_ids[ig_id] = True
                    unique_accounts.append(ig_acc)
            
            golike_acc['instagram_accounts'] = unique_accounts
            
            print(f"✅ Cleaned {len(golike_acc['instagram_accounts'])} unique IG accounts for {golike_acc.get('username_account', 'N/A')}")
    
    return data

@eel.expose
def check_instagram_cookie_single(cookie_data):
    """Kiểm tra 1 cookie Instagram"""
    try:
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
        
        checker = InstagramCookieChecker(cookie, proxy)
        result = checker.check_user()
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
    """
    Đọc JSON file và tự động remove duplicates
    """
    try:
        if not os.path.exists(file_path):
            return {"success": True, "data": []}
        
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # AUTOMATICALLY CLEAN DUPLICATES
        cleaned_data = remove_duplicates_from_data(data)
        
        return {"success": True, "data": cleaned_data}
    except Exception as e:
        print(f"❌ Error reading JSON: {str(e)}")
        return {"success": False, "error": str(e)}


@eel.expose
def write_json_file(file_path, data):
    """
    Lưu JSON file - LOẠI BỎ DUPLICATES TRƯỚC KHI LƯU
    """
    try:
        updated_accounts = []
        print(f"\n{'='*60}")
        print(f"💾 SAVING JSON FILE")
        print(f"{'='*60}")
        
        for acc in data:
            try:
                # Get updated account info from API
                acc_new = GolikeManager(acc).get_me_account()
                
                # CRITICAL: Remove duplicates BEFORE adding
                if 'instagram_accounts' in acc_new:
                    seen_ids = {}
                    unique_ig = []
                    
                    for ig in acc_new['instagram_accounts']:
                        ig_id = ig.get('id')
                        if ig_id and ig_id not in seen_ids:
                            seen_ids[ig_id] = True
                            unique_ig.append(ig)
                    
                    acc_new['instagram_accounts'] = unique_ig
                    print(f"   ✅ {acc_new.get('username_account')}: {len(unique_ig)} unique IG accounts")
                
                updated_accounts.append(acc_new)
                
            except Exception as e:
                print(f"   ⚠️ Error updating account: {str(e)}")
                # Nếu lỗi API, vẫn giữ data cũ nhưng clean duplicates
                if 'instagram_accounts' in acc:
                    seen_ids = {}
                    unique_ig = []
                    for ig in acc['instagram_accounts']:
                        ig_id = ig.get('id')
                        if ig_id and ig_id not in seen_ids:
                            seen_ids[ig_id] = True
                            unique_ig.append(ig)
                    acc['instagram_accounts'] = unique_ig
                
                updated_accounts.append(acc)

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(updated_accounts, f, ensure_ascii=False, indent=4)
        
        print(f"✅ Saved successfully - Total accounts: {len(updated_accounts)}")
        print(f"{'='*60}\n")
        
        return {"success": True}
        
    except Exception as e:
        print(f"❌ Error saving JSON: {str(e)}")
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
def update_instagram_accounts(data):
    """
    Thêm bulk Instagram accounts và trả về chi tiết kết quả
    """
    try:
        # Khởi tạo InstagramManager và check accounts
        instagram_manager = InstagramManager(data)
        results = instagram_manager.thread_check_account()
        
        # Phân loại kết quả
        successful = [r for r in results if r['success']]
        failed = [r for r in results if not r['success']]
        
        print(f"\n{'='*60}")
        print(f"📊 INSTAGRAM ACCOUNTS CHECK RESULTS")
        print(f"{'='*60}")
        print(f"✅ Thành công: {len(successful)}")
        print(f"❌ Thất bại: {len(failed)}")
        print(f"{'='*60}\n")
        
        # Log chi tiết các lỗi
        if failed:
            print("❌ CHI TIẾT CÁC TÀI KHOẢN LỖI:")
            print("-" * 60)
            for idx, err in enumerate(failed, 1):
                print(f"\n{idx}. Username: {err.get('username', 'N/A')}")
                print(f"   Status: {err.get('status')}")
                print(f"   Lỗi: {err.get('message')}")
                print(f"   Cookie: {err.get('cookie', 'N/A')[:50]}...")
                print(f"   Proxy: {err.get('proxy', 'N/A')}")
        
        # Trả về kết quả đầy đủ cho frontend
        return {
            "success": True,
            "message": f"Đã xử lý {len(results)} accounts",
            "total": len(results),
            "successful_count": len(successful),
            "failed_count": len(failed),
            "successful": successful,
            "failed": failed,
            "results": results  # Trả về toàn bộ kết quả
        }
        
    except Exception as e:
        print(f"❌ Error in update_instagram_accounts: {str(e)}")
        return {
            "success": False, 
            "error": str(e),
            "total": 0,
            "successful_count": 0,
            "failed_count": 0,
            "results": []
        }
# Thêm hàm callback để update progress realtime
@eel.expose
def update_instagram_check_progress(result):
    """Callback được gọi từ Python khi check từng account"""
    try:
        # Frontend sẽ lắng nghe qua eel.update_instagram_check_progress()
        return {"success": True}
    except:
        return {"success": False}
    
@eel.expose
def process_instagram_accounts(data):
    """
    MAIN FUNCTION - Xử lý bulk Instagram accounts với progress realtime
    Được gọi từ JS: eel.process_instagram_accounts(dataToSave)()
    """
    try:
        print(f"\n{'='*60}")
        print(f"🚀 PROCESS INSTAGRAM ACCOUNTS")
        print(f"{'='*60}")
        print(f"📥 GoLike ID: {data.get('golike_account_id')}")
        print(f"📥 GoLike Username: {data.get('golike_username')}")
        print(f"📥 Total new accounts: {len(data.get('new_instagram_accounts', []))}")
        print(f"{'='*60}\n")
        
        # Validate input
        if not data.get('golike_account_id') or not data.get('golike_authorization'):
            return {
                "success": False,
                "error": "Thiếu thông tin GoLike account",
                "total": 0,
                "successful_count": 0,
                "failed_count": 0,
                "successful": [],
                "failed": []
            }
        
        new_accounts = data.get('new_instagram_accounts', [])
        if not new_accounts:
            return {
                "success": False,
                "error": "Không có Instagram accounts để xử lý",
                "total": 0,
                "successful_count": 0,
                "failed_count": 0,
                "successful": [],
                "failed": []
            }
        
        # Khởi tạo InstagramManager
        instagram_manager = InstagramManager(data)
        
        # Check accounts với progress callback
        results = instagram_manager.thread_check_account()
        
        # Phân loại kết quả
        successful = [r for r in results if r.get('success')]
        failed = [r for r in results if not r.get('success')]
        
        print(f"\n{'='*60}")
        print(f"📊 RESULTS SUMMARY")
        print(f"{'='*60}")
        print(f"✅ Successful: {len(successful)}")
        print(f"❌ Failed: {len(failed)}")
        print(f"📊 Total: {len(results)}")
        print(f"{'='*60}\n")
        
        # Log chi tiết failed accounts
        if failed:
            print("❌ FAILED ACCOUNTS DETAIL:")
            for idx, acc in enumerate(failed, 1):
                print(f"   {idx}. {acc.get('username', 'N/A')}: {acc.get('message')}")
            print()
        
        return {
            "success": True,
            "message": f"Đã xử lý {len(results)} accounts",
            "total": len(results),
            "successful_count": len(successful),
            "failed_count": len(failed),
            "successful": successful,
            "failed": failed
        }
        
    except Exception as e:
        print(f"❌ ERROR in process_instagram_accounts: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "success": False,
            "error": str(e),
            "total": 0,
            "successful_count": 0,
            "failed_count": 0,
            "successful": [],
            "failed": []
        }
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
        eel.update_runner_log("🔥 Đã nhận dữ liệu từ frontend")
        
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
        print(f"❌ JSON parse error: {str(e)}")
        return {"success": False, "error": f"Lỗi parse JSON: {str(e)}"}
    except Exception as e:
        print(f"❌ Error in receive_runner_data: {str(e)}")
        return {"success": False, "error": str(e)}

@eel.expose
def get_runner_stats():
    """Lấy stats hiện tại của runner"""
    global runner_stats, is_runner_active, current_runner_instance
    
    try:
        actual_running_count = 0
        if current_runner_instance and hasattr(current_runner_instance, 'is_running'):
            if current_runner_instance.is_running:
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
        
        for key, value in stats_data.items():
            if key in runner_stats:
                runner_stats[key] = value
        
        try:
            eel.update_runner_stats(runner_stats)
        except:
            pass
        
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
    """
    Dừng runner - FORCE STOP TẤT CẢ THREADS
    """
    global is_runner_active, runner_data, current_runner_instance, runner_stats
    
    try:
        print(f"\n{'='*60}")
        print(f"🛑 STOPPING RUNNER")
        print(f"{'='*60}")
        
        # Set flag đầu tiên
        is_runner_active = False
        
        # Stop instance nếu tồn tại
        if current_runner_instance:
            print("   ⏹️ Stopping current runner instance...")
            current_runner_instance.stop()
            
            # Đợi một chút để threads cleanup
            time.sleep(1)
            
            current_runner_instance = None
            print("   ✅ Runner instance stopped")
        
        runner_data = None
        
        # Reset running count
        runner_stats['running_count'] = 0
        
        # Gửi stats update về frontend
        try:
            eel.update_runner_stats(runner_stats)
            eel.update_runner_log("✅ Đã dừng runner thành công!")
        except:
            pass
        
        print(f"✅ Runner stopped successfully")
        print(f"{'='*60}\n")
        
        return {"success": True, "message": "Đã dừng runner"}
        
    except Exception as e:
        print(f"❌ Error stopping runner: {str(e)}")
        return {"success": False, "error": str(e)}

@eel.expose
def get_runner_status():
    """Lấy trạng thái runner hiện tại"""
    global is_runner_active, runner_data, current_runner_instance
    
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
# Thêm vào file main Python (app.py hoặc tương tự)

@eel.expose
def update_checked_status_only(ig_ids_to_mark):
    """
    Chỉ update trạng thái checked mà KHÔNG gọi API GoLike
    Tránh duplicate khi đánh dấu accounts đã chạy
    
    Args:
        ig_ids_to_mark: List of Instagram IDs cần đánh dấu checked=True
    """
    try:
        file_path = 'data/manager-golike.json'
        
        # Đọc file hiện tại
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}
        
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Parse ig_ids nếu là string
        if isinstance(ig_ids_to_mark, str):
            ig_ids_to_mark = json.loads(ig_ids_to_mark)
        
        marked_count = 0
        
        # Chỉ update checked cho các IDs được chọn
        for golike_acc in data:
            if 'instagram_accounts' in golike_acc:
                for ig_acc in golike_acc['instagram_accounts']:
                    if ig_acc.get('id') in ig_ids_to_mark:
                        ig_acc['checked'] = True
                        marked_count += 1
                        print(f"✓ Marked checked: {ig_acc.get('instagram_username', 'N/A')}")
        
        # Lưu file TRỰC TIẾP mà KHÔNG gọi API
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        
        print(f"\n✅ Đã đánh dấu {marked_count} Instagram accounts là 'checked'\n")
        
        return {
            "success": True,
            "marked_count": marked_count
        }
        
    except Exception as e:
        print(f"❌ Error updating checked status: {str(e)}")
        return {"success": False, "error": str(e)}


@eel.expose
def reset_checked_status_all():
    """
    Reset tất cả checked = False mà KHÔNG gọi API
    """
    try:
        file_path = 'data/manager-golike.json'
        
        if not os.path.exists(file_path):
            return {"success": False, "error": "File không tồn tại"}
        
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        reset_count = 0
        
        # Reset tất cả checked = False
        for golike_acc in data:
            if 'instagram_accounts' in golike_acc:
                for ig_acc in golike_acc['instagram_accounts']:
                    ig_acc['checked'] = False
                    reset_count += 1
        
        # Lưu file TRỰC TIẾP
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        
        print(f"✅ Đã reset {reset_count} Instagram accounts về 'unchecked'\n")
        
        return {
            "success": True,
            "reset_count": reset_count
        }
        
    except Exception as e:
        print(f"❌ Error resetting checked status: {str(e)}")
        return {"success": False, "error": str(e)}


@eel.expose
def write_json_file_direct(file_path, data):
    """
    Lưu JSON trực tiếp mà KHÔNG gọi API - dùng cho việc sửa nhanh
    """
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        
        print(f"✅ Saved directly to {file_path} without API call")
        
        return {"success": True}
        
    except Exception as e:
        print(f"❌ Error saving JSON directly: {str(e)}")
        return {"success": False, "error": str(e)}
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