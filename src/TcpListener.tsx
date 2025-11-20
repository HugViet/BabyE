import React, { useEffect } from 'react';
import TcpSocket from 'react-native-tcp-socket';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import PushNotification from 'react-native-push-notification';
import { Platform, DeviceEventEmitter } from 'react-native';
import RNFS from 'react-native-fs'; // 👈 BẮT BUỘC CÓ

const PORT = 8888;
const STORAGE_KEY = 'SAVED_CONTACTS';
const DELIMITER = "||END_MSG||"; 

const showLocalNotification = (title: string, message: string) => {
    PushNotification.localNotification({
        channelId: "chat-messages",
        title: title,
        message: message,
        playSound: true,
        soundName: 'default',
    });
};

PushNotification.configure({
    onRegister: function (token) {},
    onNotification: function (notification) {},
    permissions: { alert: true, sound: true, badge: true },
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
});

PushNotification.createChannel(
    { channelId: "chat-messages", channelName: "Tin nhắn P2P", soundName: "default", importance: 4, vibrate: true },
    (created) => console.log(`createChannel returned '${created}'`)
);

const TcpListener: React.FC = () => { 
  useEffect(() => {
    const server = TcpSocket.createServer((socket: any) => {
      let buffer = '';

      socket.on('data', async (data: any) => {
        const chunk = data.toString('utf8');
        buffer += chunk;

        while (buffer.includes(DELIMITER)) {
            const parts = buffer.split(DELIMITER);
            const completeMessage = parts[0]; 
            buffer = parts.slice(1).join(DELIMITER); 

            if (!completeMessage.trim()) continue;

            try {
                const receivedPayload = JSON.parse(completeMessage);
                const senderIpWithPort = socket.remoteAddress;
                const senderIp = senderIpWithPort ? senderIpWithPort.replace('::ffff:', '').split('%')[0] : '';
                
                if (senderIp) {
                    const CHAT_STORAGE_KEY = `@chat_${senderIp}`;
                    
                    // 🔥 BƯỚC XỬ LÝ QUAN TRỌNG: GIẢI PHÓNG BASE64 KHỎI RAM
                    let finalContent = receivedPayload.content;
                    const type = receivedPayload.type;

                    // Nếu là Media và chứa Base64 (không phải đường dẫn file)
                    if (['image', 'video'].includes(type) && !finalContent.startsWith('file://')) {
                        const ext = type === 'image' ? 'jpg' : 'mp4';
                        // Tạo tên file unique
                        const fileName = `received_${type}_${Date.now()}.` + ext;
                        const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

                        try {
                            // Ghi ra đĩa ngay lập tức
                            await RNFS.writeFile(destPath, finalContent, 'base64');
                            console.log(`✅ [Listener] Đã lưu file ${type} vào: ${destPath}`);
                            
                            // Thay thế nội dung Base64 bằng đường dẫn file
                            finalContent = `file://${destPath}`;
                        } catch (err) {
                            console.log("❌ [Listener] Lỗi ghi file:", err);
                            // Nếu lỗi ghi file, đành chấp nhận mất nội dung hoặc giữ nguyên (nhưng sẽ crash)
                            // Tốt nhất là gán báo lỗi để không sập app
                            finalContent = "Lỗi: Không thể lưu file media này.";
                        }
                    }

                    // 2. LƯU VÀO LỊCH SỬ (Lúc này finalContent chỉ là đường dẫn ngắn tí tẹo)
                    const existingMessages = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
                    let messages = existingMessages ? JSON.parse(existingMessages) : [];
                    
                    messages.push({ 
                        type: type || 'text', 
                        content: finalContent, // 👈 LƯU ĐƯỜNG DẪN
                        fileName: receivedPayload.fileName,
                        sender: 'other', 
                        timestamp: new Date().toISOString() 
                    });
                    
                    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
                    
                    // 3. BẮN TÍN HIỆU
                    DeviceEventEmitter.emit('NEW_MESSAGE_RECEIVED', { ip: senderIp });

                    // 4. THÔNG BÁO
                    const jsonContacts = await AsyncStorage.getItem(STORAGE_KEY);
                    const contacts = jsonContacts ? JSON.parse(jsonContacts) : [];
                    const foundContact = contacts.find((c: any) => c.ip === senderIp);
                    
                    let title = foundContact ? `💬 ${foundContact.name}` : `📩 ${senderIp}`;
                    let messageBody = type === 'image' ? '📷 Ảnh mới' : (type === 'video' ? '🎥 Video mới' : finalContent);

                    showLocalNotification(title, messageBody);
                }
            } catch (e) { console.log("Lỗi Parse Listener:", e); }
        }
      });
    });

    server.listen({ port: PORT, host: '0.0.0.0' }, () => console.log(`GLOBAL SERVER LISTENING ON PORT ${PORT}`));
    return () => { };
  }, []);

  return null;
};

export default TcpListener;