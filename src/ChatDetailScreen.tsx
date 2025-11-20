import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  View, KeyboardAvoidingView, Platform, Alert, Dimensions, ImageBackground, Image,
  Modal, ActivityIndicator, Clipboard
} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker'; 
import RNFS from 'react-native-fs';
import Video from 'react-native-video'; 
import { Video as VideoCompressor } from 'react-native-compressor';

const PORT = 8888;
const CONNECTION_TIMEOUT_MS = 3000;
const CONTACTS_KEY = 'SAVED_CONTACTS'; 
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message { type: 'text' | 'image' | 'video'; content: string; sender: 'me' | 'other'; timestamp: Date; }

const VideoMessage = ({ base64Content }: { base64Content: string }) => {
    const [videoUri, setVideoUri] = useState<string | null>(null);
    useEffect(() => {
        const prepareVideo = async () => {
            if (base64Content.startsWith('file://')) {
                setVideoUri(base64Content);
            } else {
                const filePath = `${RNFS.CachesDirectoryPath}/video_${Date.now()}.mp4`;
                try {
                    if (!await RNFS.exists(filePath)) await RNFS.writeFile(filePath, base64Content, 'base64');
                    setVideoUri(filePath);
                } catch (err) {}
            }
        };
        prepareVideo();
    }, [base64Content]);

    if (!videoUri) return <ActivityIndicator size="small" color="#fff" />;
    return (
        <View style={styles.mediaMessage}>
            <Video source={{ uri: videoUri }} style={styles.videoPlayer} controls={true} resizeMode="contain" paused={true} />
        </View>
    );
};

function ChatDetailScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<any>();

  const params = route.params as { targetIp?: string, targetName?: string } || {};
  const targetIp = params.targetIp || '';
  const targetName = params.targetName || 'Người lạ';
  const CHAT_STORAGE_KEY = `@chat_${targetIp}`; 

  const [targetIpState] = useState<string>(targetIp);
  const [targetNameState, setTargetNameState] = useState<string>(targetName);
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customAlert, setCustomAlert] = useState<{visible: boolean, title: string, message: string}>({
      visible: false, title: '', message: ''
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const serverRef = useRef<any>(null);

  useEffect(() => {
    const server = TcpSocket.createServer((socket: any) => {
      socket.on('data', async (data: any) => {
          loadHistoryFromStorage(); 
      });
    });
    server.listen({ port: PORT, host: '0.0.0.0' }, () => {});
    serverRef.current = server;
    return () => { if (serverRef.current) serverRef.current.close(); };
  }, []); 

  const showAlert = (title: string, message: string) => {
      setCustomAlert({ visible: true, title, message });
  };

  const loadHistoryFromStorage = async () => {
      if (!targetIpState) return;
      try {
        const jsonMessages = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (jsonMessages) {
          const loadedMessages: Message[] = JSON.parse(jsonMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            type: msg.type || 'text', 
          }));
          setMessages(prev => {
              if (loadedMessages.length !== prev.length) return loadedMessages;
              return prev;
          });
        } else {
            setMessages([]); 
        }
      } catch (e) {}
  };

  useFocusEffect(
    useCallback(() => {
      loadHistoryFromStorage();
      const intervalId = setInterval(loadHistoryFromStorage, 1000);
      return () => clearInterval(intervalId);
    }, [targetIpState])
  );

  useEffect(() => {
    if (messages.length > 0 && targetIpState) {
      const saveHistory = async () => {
        try {
          const jsonMessages = JSON.stringify(messages);
          await AsyncStorage.setItem(CHAT_STORAGE_KEY, jsonMessages);
        } catch (e) {}
      };
      saveHistory();
    }
  }, [messages, targetIpState]);

  const handleRename = async () => {
      if (!newName.trim()) { showAlert('Lỗi', 'Tên không được để trống'); return; }
      try {
          const jsonContacts = await AsyncStorage.getItem(CONTACTS_KEY);
          let contacts = jsonContacts ? JSON.parse(jsonContacts) : [];
          let found = false;
          const newContacts = contacts.map((c: any) => {
              if (c.ip === targetIpState) { found = true; return { ...c, name: newName.trim() }; }
              return c;
          });
          if (!found) newContacts.push({ id: Date.now().toString(), name: newName.trim(), ip: targetIpState });
          await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(newContacts));
          setTargetNameState(newName.trim());
          setShowSettings(false); setIsRenaming(false); setNewName('');
      } catch (e) { showAlert('Lỗi', 'Không lưu được tên mới.'); }
  };

  const confirmDelete = async () => {
      await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
      setMessages([]); 
      setShowDeleteConfirm(false);
  };

  const copyIpToClipboard = () => {
      Clipboard.setString(targetIpState);
      showAlert('Đã copy', `IP: ${targetIpState}`);
      setShowSettings(false);
  };

  const saveMyMessageToStorage = async (msg: Message) => {
      try {
          const existingJson = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
          const list = existingJson ? JSON.parse(existingJson) : [];
          list.push({ ...msg, timestamp: msg.timestamp.toISOString() });
          await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(list));
          loadHistoryFromStorage();
      } catch (e) {}
  }

  const copyFileToStorage = async (sourceUri: string, type: string): Promise<string> => {
      let ext = type === 'image' ? 'jpg' : 'mp4';
      const fileName = `${type}_${Date.now()}_sent.${ext}`;
      const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      try {
          const cleanSource = sourceUri.replace('file://', '');
          await RNFS.copyFile(cleanSource, destPath);
          return `file://${destPath}`; 
      } 
      catch (e) { 
          console.log("Lỗi copy file:", e);
          return sourceUri; 
      }
  };

  const sendPayload = (content: string, type: 'text' | 'image' | 'video', localFileUri?: string) => {
    if (!targetIp.trim()) { showAlert('Lỗi', 'Chưa có IP đối phương.'); return; }
    const payload = JSON.stringify({ type, content });
    const packet = payload + "||END_MSG||";

    let connectionTimeout: NodeJS.Timeout; 
    connectionTimeout = setTimeout(() => { client.destroy(); setIsSending(false); showAlert('Lỗi', 'Timeout!'); }, 40000); 

    const client = TcpSocket.createConnection({ port: PORT, host: targetIp }, () => {
      clearTimeout(connectionTimeout);
      client.write(packet, 'utf8', async () => {
        let processedContent = content;
        if (localFileUri) {
             processedContent = localFileUri;
        }
        const myMsg: Message = { type, content: processedContent, sender: 'me', timestamp: new Date() };
        await saveMyMessageToStorage(myMsg);
        client.destroy();
        setIsSending(false); 
      });
    });
    client.on('error', (err) => { clearTimeout(connectionTimeout); setIsSending(false); showAlert('Lỗi', 'Gửi thất bại'); });
  };

  const pickMediaAndSend = async () => {
    if (isSending || isCompressing) return;
    
    const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8, includeBase64: false });

    if (result.didCancel || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];
    let uri = asset.uri;
    if (!uri) return;

    const isVideo = asset.type?.includes('video');
    const typeToSend = isVideo ? 'video' : 'image';

    if (isVideo && (asset.fileSize || 0) > 50000000) { 
        showAlert('Video quá lớn', 'Chọn video nhỏ hơn 50MB');
        return;
    }

    setIsSending(true);
    
    try {
        if (isVideo) {
            setIsCompressing(true);
            const compressedUri = await VideoCompressor.compress(uri, { compressionMethod: 'auto', maxWidth: 480, quality: 0.7 });
            uri = compressedUri; 
            setIsCompressing(false);
        }

        const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
        const base64Data = await RNFS.readFile(cleanUri, 'base64');
        
        const savedLocalPath = await copyFileToStorage(uri, typeToSend);
        sendPayload(base64Data, typeToSend, savedLocalPath);

    } catch (error) {
        setIsCompressing(false); setIsSending(false); showAlert('Lỗi', 'Không xử lý được file.');
    }
  };

  const sendMessage = () => {
    if (isSending || !message.trim()) return;
    const textToSend = message.trim();
    setMessage('');
    sendPayload(textToSend, 'text');
  };

  const renderMessageContent = (msg: Message) => {
    let sourceUri = msg.content;
    const isFile = msg.content.startsWith('file://');

    if (msg.type === 'image') {
        if (!isFile) sourceUri = `data:image/jpeg;base64,${msg.content}`;
        return <Image source={{ uri: sourceUri }} style={styles.imageMessage} resizeMode="cover"/>;
    }
    if (msg.type === 'video') {
        return <VideoMessage base64Content={msg.content} />;
    }
    return <Text style={msg.sender === 'me' ? styles.meText : styles.otherText}>{msg.content}</Text>;
  };

  const cancelCompression = () => { setIsCompressing(false); setIsSending(false); };

  return (
    <ImageBackground source={require('../image/talk/background_talk.jpg')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.root}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>{targetNameState}</Text> 
                <Text style={styles.headerSubtitle}>{targetIpState}</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => {
                setNewName(targetNameState); setShowSettings(true); setIsRenaming(false);
            }}>
              <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.chatContainer}>
            <ScrollView 
                ref={scrollViewRef} 
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
            >
              {messages.length === 0 ? (
                  <View style={styles.emptyState}>
                      <Ionicons name="chatbubbles-outline" size={60} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.emptyText}>Bắt đầu chat với {targetNameState}</Text>
                  </View>
              ) : (
                  messages.map((msg, index) => (
                    <View key={index} style={[styles.bubbleWrapper, msg.sender === 'me' ? styles.meWrapper : styles.otherWrapper]}>
                       <View style={[
                           styles.bubble, 
                           msg.sender === 'me' ? styles.meBubble : styles.otherBubble,
                           (msg.type !== 'text') ? { padding: 5, backgroundColor: 'transparent' } : {} 
                        ]}>
                          {renderMessageContent(msg)}
                       </View>
                  </View>
                  ))
              )}
            </ScrollView>
          </View>

          <Modal animationType="fade" transparent={true} visible={showSettings} onRequestClose={() => setShowSettings(false)}>
            <View style={styles.compressOverlay}>
                <View style={styles.settingsBox}>
                    <Text style={styles.settingsTitle}>Cài đặt</Text>
                    {!isRenaming ? (
                        <View style={{width: '100%'}}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => setIsRenaming(true)}>
                                <Ionicons name="pencil-outline" size={22} color="#333" />
                                <Text style={styles.menuText}>Đổi tên gợi nhớ</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowSettings(false); setTimeout(() => setShowDeleteConfirm(true), 300); }}>
                                <Ionicons name="trash-outline" size={22} color="#ff4d4f" />
                                <Text style={[styles.menuText, {color: '#ff4d4f'}]}>Xóa lịch sử chat</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0}]} onPress={copyIpToClipboard}>
                                <Ionicons name="copy-outline" size={22} color="#333" />
                                <Text style={styles.menuText}>Copy IP ({targetIpState})</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{width: '100%'}}>
                            <Text style={styles.label}>Nhập tên mới:</Text>
                            <TextInput style={styles.renameInput} value={newName} onChangeText={setNewName} placeholder="VD: Bạn hiền" autoFocus />
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc'}]} onPress={() => setIsRenaming(false)}><Text>Hủy</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, {backgroundColor: '#bd6ce2ff'}]} onPress={handleRename}><Text style={{color: '#fff', fontWeight: 'bold'}}>Lưu</Text></TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {!isRenaming && (
                        <TouchableOpacity style={[styles.cancelBtn, {marginTop: 20}]} onPress={() => setShowSettings(false)}><Text style={styles.cancelText}>Đóng</Text></TouchableOpacity>
                    )}
                </View>
            </View>
          </Modal>

          <Modal animationType="fade" transparent={true} visible={showDeleteConfirm} onRequestClose={() => setShowDeleteConfirm(false)}>
            <View style={styles.compressOverlay}>
                <View style={[styles.settingsBox, {alignItems: 'center'}]}>
                    <Ionicons name="warning-outline" size={50} color="#ff4d4f" style={{marginBottom: 10}} />
                    <Text style={[styles.settingsTitle, {color: '#ff4d4f'}]}>Xóa lịch sử?</Text>
                    <Text style={{textAlign: 'center', color: '#555', marginBottom: 20, fontSize: 16}}>
                        Tin nhắn bị xóa sẽ không thể khôi phục. Bạn có chắc muốn xóa tất cả tin nhắn với {targetNameState}?
                    </Text>
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc'}]} onPress={() => setShowDeleteConfirm(false)}>
                            <Text style={{fontWeight: '600'}}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, {backgroundColor: '#ff4d4f'}]} onPress={confirmDelete}>
                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Xác nhận</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
          </Modal>

          <Modal animationType="fade" transparent={true} visible={customAlert.visible} onRequestClose={() => setCustomAlert({...customAlert, visible: false})}>
            <View style={styles.compressOverlay}>
                <View style={[styles.settingsBox, {paddingVertical: 25}]}>
                    <Text style={styles.settingsTitle}>{customAlert.title}</Text>
                    <Text style={{textAlign: 'center', color: '#333', marginBottom: 20, fontSize: 16}}>{customAlert.message}</Text>
                    <TouchableOpacity 
                        style={[styles.btn, {backgroundColor: '#bd6ce2ff', width: '50%'}]} 
                        onPress={() => setCustomAlert({...customAlert, visible: false})}
                    >
                        <Text style={{color: '#fff', fontWeight: 'bold'}}>OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
          </Modal>

          <Modal animationType="fade" transparent={true} visible={isCompressing} onRequestClose={() => {}}>
            <View style={styles.compressOverlay}>
                <View style={styles.compressBox}>
                    <Text style={styles.compressTitle}>🎥 Đang xử lý Video...</Text>
                    <ActivityIndicator size="large" color="#bd6ce2ff" style={{marginVertical: 20}} />
                    <Text style={styles.compressSubtitle}>Đang nén cho nhẹ...</Text>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelCompression}><Text style={styles.cancelText}>Hủy bỏ</Text></TouchableOpacity>
                </View>
            </View>
          </Modal>

          <View style={styles.inputArea}>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickMediaAndSend} disabled={isSending}>
                <Ionicons name="images-outline" size={28} color="#bd6ce2ff" />
            </TouchableOpacity>
            <TextInput style={[styles.chatInput, { marginRight: 0, flex: 1 }]} placeholder="Nhắn tin..." placeholderTextColor="#888" value={message} onChangeText={setMessage} editable={!isSending}/>
            <TouchableOpacity style={[styles.sendBtn, isSending && styles.sendButtonDisabled]} onPress={sendMessage} disabled={isSending || !message.trim()}>
              <Ionicons name={isSending ? "hourglass-outline" : "send"} size={20} color="#fff" />
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 10 },
  iconBtn: { height: 40, width: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', marginHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerSubtitle: { color: '#ddd', fontSize: 12 },
  chatContainer: { flex: 1 },
  emptyState: { alignItems: 'center', marginTop: 150 },
  emptyText: { color: '#fff', fontWeight: '600' },
  bubbleWrapper: { flexDirection: 'row', marginBottom: 10 },
  meWrapper: { justifyContent: 'flex-end', paddingRight: 10 },
  otherWrapper: { justifyContent: 'flex-start', paddingLeft: 10 },
  bubble: { maxWidth: SCREEN_WIDTH * 0.75, padding: 10, borderRadius:15 },
  meBubble: { backgroundColor: '#bd6ce2ff', borderBottomRightRadius: 2 },
  otherBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 2 },
  meText: { color: '#fff', fontSize: 16 },
  otherText: { color: '#000', fontSize: 16 },
  mediaMessage: { width: 220, height: 220, borderRadius: 15, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  imageMessage: { width: 220, height: 220, borderRadius: 15 },
  videoPlayer: { width: '100%', height: '100%', borderRadius: 15 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  mediaBtn: { padding: 5, marginRight: 5 },
  chatInput: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 15, height: 40, color: '#000', marginRight: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#bd6ce2ff', justifyContent: 'center', alignItems: 'center',marginLeft: 6 },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  
  // MODAL STYLES
  compressOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  compressBox: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5 },
  compressTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  compressSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, borderWidth: 1, borderColor: '#ff4d4f' },
  cancelText: { color: '#ff4d4f', fontWeight: 'bold' },
  
  settingsBox: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 },
  settingsTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#bd6ce2ff' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, width: '100%', borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuText: { fontSize: 16, marginLeft: 15, color: '#333', fontWeight: '500' },
  label: { alignSelf: 'flex-start', marginBottom: 5, color: '#666' },
  renameInput: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, fontSize: 16, marginBottom: 15, color: '#333' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  btn: { flex: 0.48, padding: 12, borderRadius: 10, alignItems: 'center' },
});

export default ChatDetailScreen;