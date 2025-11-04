from datetime import datetime, timezone
import base64
import os
import json
import supabase
import subprocess, platform, os, uuid, winreg


class Check_key:
    def __init__(self):
                
        base_url = "https://cgogqyorfzpxaiotscfp.supabase.co"
        token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnb2dxeW9yZnpweGFpb3RzY2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5ODMyMzcsImV4cCI6MjA2MzU1OTIzN30.enehR9wGHJf1xKO7d4XBbmjfdm80EvBKzaaPO3NPVAM'
        self.supabase_client = supabase.create_client(base_url, token)
        self.res = self.supabase_client.table("Golike").select("*").execute()

    def get_device_id(self):
        try:  # Windows
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as k:
                return winreg.QueryValueEx(k, "MachineGuid")[0]
        except:
            sys = platform.system().lower()
            if sys == "linux":
                return open("/etc/machine-id").read().strip()
            elif sys == "darwin":
                return subprocess.check_output(["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"]).decode().split('"IOPlatformUUID" = "')[1].split('"')[0]
            else:
                f = os.path.expanduser("~/.device_id")
                if not os.path.exists(f): open(f, "w").write(str(uuid.uuid4()))
                return open(f).read().strip()
            
    def check_update(self, key, version):
        for data in self.res.data:
            if data['id'] == key:
                datetime_key = data['created_at']
                target_time = datetime.strptime(datetime_key, "%Y-%m-%d")
                now = datetime.now()

                # nếu hiện tại nhỏ hơn ngày hết hạn thì key vẫn còn hạn
                if version == data['update_version']:
                    if now < target_time:
                        print(f"✅ Key còn hạn đến {target_time}")
                        id_device = self.get_device_id()
                        if data['status'] == 'test':
                            return {'data': True}
                        elif  id_device == data['device']:
                            print(f"✅ Thiết bị hợp lệ: {id_device}")
                            return {'data': True}
                        elif data['device'] == None:
                            self.supabase_client.table("Golike").update({"device": id_device}).eq("id", key).execute()
                        else:
                            return {'data': False, 'status': 'Thiết bị không hợp lệ'}
                    else:
                        print(f"❌ Key đã hết hạn ({target_time})")
                        return {'data': False, 'status': 'Key đã hết hạn'}
                else:
                    return {'data': False, 'status': 'Phiên bản tool đã cũ'}

        return {'data': False, 'status': 'Key không đúng'}

# Check_key().checK_update()