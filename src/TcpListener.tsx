import React, { useEffect } from 'react';
import TcpSocket from 'react-native-tcp-socket';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import PushNotification from 'react-native-push-notification';
import { Platform, DeviceEventEmitter } from 'react-native';
import RNFS from 'react-native-fs';

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
                const senderIp = socket.remoteAddress ? socket.remoteAddress.replace('::ffff:', '').split('%')[0].trim() : '';
                
                if (senderIp) {
                    const CHAT_STORAGE_KEY = `@chat_${senderIp}`;
                    
                    let contentToSave = receivedPayload.content || '';
                    const type = receivedPayload.type;

                    if (['image', 'video', 'audio'].includes(type) && contentToSave.length > 200 && !contentToSave.startsWith('file://')) {
                         let ext = 'dat';
                         if (type === 'image') ext = 'jpg';
                         else if (type === 'video') ext = 'mp4';
                         else if (type === 'audio') ext = 'mp3';

                         const fileName = `recv_${type}_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
                         const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

                         try {
                             await RNFS.writeFile(destPath, contentToSave, 'base64');
                             console.log(`✅ [Listener] Đã lưu ${type} vào: ${destPath}`);
                             contentToSave = `file://${destPath}`; 
                         } catch (err) {
                             console.log("❌ [Listener] Lỗi ghi file:", err);
                         }
                    }

                    const existingMessages = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
                    let messages = existingMessages ? JSON.parse(existingMessages) : [];
                    
                    messages.push({ 
                        type: type || 'text', 
                        content: contentToSave, 
                        fileName: receivedPayload.fileName,
                        sender: 'other', 
                        timestamp: new Date().toISOString() 
                    });
                    
                    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
                    DeviceEventEmitter.emit('NEW_MESSAGE_RECEIVED', { ip: senderIp });

                    const jsonContacts = await AsyncStorage.getItem(STORAGE_KEY);
                    const contacts = jsonContacts ? JSON.parse(jsonContacts) : [];
                    const foundContact = contacts.find((c: any) => c.ip === senderIp);
                    
                    let title = foundContact ? `💬 ${foundContact.name}` : `📩 ${senderIp}`;
                    let messageBody = 'Tin nhắn mới';
                    if (type === 'image') messageBody = '📷 Ảnh mới';
                    else if (type === 'video') messageBody = '🎥 Video mới';
                    else if (type === 'audio') messageBody = '🎵 Tin nhắn thoại';
                    else messageBody = receivedPayload.content;

                    showLocalNotification(title, messageBody);
                }
            } catch (e) { console.log("Lỗi Parse:", e); }
        }
      });
    });

    server.listen({ port: PORT, host: '0.0.0.0' }, () => {});
    return () => { };
  }, []);

  return null;
};

export default TcpListener;