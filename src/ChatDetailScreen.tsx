import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  View, KeyboardAvoidingView, Platform, Alert, Dimensions, ImageBackground, Image,
  Modal, ActivityIndicator, DeviceEventEmitter, Clipboard, PermissionsAndroid
} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker'; 
import RNFS from 'react-native-fs';
import Video from 'react-native-video'; 
import { Video as VideoCompressor } from 'react-native-compressor';
import FileViewer from 'react-native-file-viewer';
import { pick, types } from '@react-native-documents/picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const PORT = 8888;
const CONNECTION_TIMEOUT_MS = 5000;
const DELIMITER = "||END_MSG||";
const CONTACTS_KEY = 'SAVED_CONTACTS';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const audioRecorderPlayer = new AudioRecorderPlayer();

interface Message { type: 'text' | 'image' | 'video' | 'audio'; content: string; fileName?: string; sender: 'me' | 'other'; timestamp: Date; }

const AudioMessage = ({ content }: { content: string }) => {
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [paused, setPaused] = useState(true);
    useEffect(() => {
        const prepareAudio = async () => {
            if (content.startsWith('file://')) { setAudioUri(content); return; }
            const filePath = `${RNFS.CachesDirectoryPath}/audio_${Date.now()}.mp3`;
            try { if (!await RNFS.exists(filePath)) await RNFS.writeFile(filePath, content, 'base64'); setAudioUri(filePath); } catch (err) {}
        };
        prepareAudio();
    }, [content]);

    if (!audioUri) return <ActivityIndicator size="small" color="#fff" />;
    return (
        <View style={styles.audioMessage}>
            <TouchableOpacity onPress={() => setPaused(!paused)}>
                <Ionicons name={paused ? "play-circle" : "pause-circle"} size={36} color="#fff" />
            </TouchableOpacity>
            <View style={{marginLeft: 10}}>
                <Text style={{color: '#fff', fontSize: 12, fontWeight: 'bold'}}>Tin nhắn thoại</Text>
                <Video source={{ uri: audioUri }} style={{height: 0, width: 0}} paused={paused} audioOnly={true} onEnd={() => setPaused(true)} />
            </View>
        </View>
    );
};

const VideoMessage = ({ content }: { content: string }) => {
    const [videoUri, setVideoUri] = useState<string | null>(null);
    useEffect(() => {
        const prepareVideo = async () => {
            if (content.startsWith('file://')) { setVideoUri(content); return; }
            const filePath = `${RNFS.CachesDirectoryPath}/video_temp_${Date.now()}.mp4`;
            try { if (!await RNFS.exists(filePath)) await RNFS.writeFile(filePath, content, 'base64'); setVideoUri(filePath); } catch (err) {}
        };
        prepareVideo();
    }, [content]);
    if (!videoUri) return <View style={styles.mediaMessage}><ActivityIndicator size="small" color="#fff" /></View>;
    return (
        <View style={styles.mediaMessage}>
            <Video source={{ uri: videoUri }} style={styles.videoPlayer} controls={true} resizeMode="contain" paused={true} />
        </View>
    );
};

function ChatDetailScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const params = route.params || {};
  const targetIp = params.targetIp || '';
  const initialName = params.targetName || 'Người lạ';
  const CHAT_STORAGE_KEY = `@chat_${targetIp}`; 

  const [targetIpState] = useState<string>(targetIp);
  const [targetNameState, setTargetNameState] = useState<string>(initialName);
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customAlert, setCustomAlert] = useState<{visible: boolean, title: string, message: string}>({ visible: false, title: '', message: '' });
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');

  const scrollViewRef = useRef<ScrollView>(null);
  const serverRef = useRef<any>(null);

  useEffect(() => {
    const server = TcpSocket.createServer((socket: any) => { socket.on('data', async (data: any) => {}); });
    server.listen({ port: PORT, host: '0.0.0.0' }, () => {});
    serverRef.current = server;
    return () => { if (serverRef.current) serverRef.current.close(); };
  }, []); 

  const showAlert = (title: string, message: string) => { setCustomAlert({ visible: true, title, message }); };

  const loadHistory = useCallback(async () => {
    if (!targetIpState) return;
    try {
      const jsonMessages = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
      if (jsonMessages) {
        const loadedMessages: Message[] = JSON.parse(jsonMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          type: msg.type || 'text'
        }));
        setMessages(prev => { if (loadedMessages.length !== prev.length) return loadedMessages; return prev; });
      } else { setMessages([]); }
    } catch (e) {}
  }, [targetIpState]);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));

  useEffect(() => {
      const subscription = DeviceEventEmitter.addListener('NEW_MESSAGE_RECEIVED', (event) => {
          if (event.ip === targetIpState) loadHistory();
      });
      return () => subscription.remove();
  }, [targetIpState, loadHistory]);

  const handleRename = async () => {
      if (!newName.trim()) return;
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
      } catch (e) {}
  };
  const openDeleteConfirm = () => { setShowSettings(false); setTimeout(() => setShowDeleteConfirm(true), 300); };
  const confirmDelete = async () => { await AsyncStorage.removeItem(CHAT_STORAGE_KEY); setMessages([]); setShowDeleteConfirm(false); };
  const copyIpToClipboard = () => { Clipboard.setString(targetIpState); showAlert('Đã copy', targetIpState); setShowSettings(false); };

  const saveMyMessageToStorage = async (msg: Message) => {
      try {
          const existingJson = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
          const list = existingJson ? JSON.parse(existingJson) : [];
          list.push({ ...msg, timestamp: msg.timestamp.toISOString() });
          await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(list));
          loadHistory();
      } catch (e) {}
  }

  const saveBase64ToDisk = async (base64: string, type: string): Promise<string> => {
      let ext = 'dat';
      if (type === 'image') ext = 'jpg'; 
      else if (type === 'video') ext = 'mp4';
      else if (type === 'audio') ext = 'mp3';
      const finalName = `${type}_${Date.now()}_sent.${ext}`;
      const path = `${RNFS.DocumentDirectoryPath}/${finalName}`;
      try { if (!await RNFS.exists(path)) await RNFS.writeFile(path, base64, 'base64'); return `file://${path}`; } 
      catch (e) { return ''; }
  };

  const sendPayload = (content: string, type: 'text' | 'image' | 'video' | 'audio', fileName?: string) => {
    if (!targetIp.trim()) { showAlert('Lỗi', 'Chưa có IP.'); setIsSending(false); return; }
    const payload = JSON.stringify({ type, content, fileName });
    const packet = payload + DELIMITER;
    let connectionTimeout: NodeJS.Timeout; 
    connectionTimeout = setTimeout(() => { client.destroy(); setIsSending(false); showAlert('Lỗi', 'Timeout!'); }, 60000); 
    const client = TcpSocket.createConnection({ port: PORT, host: targetIp }, () => {
      clearTimeout(connectionTimeout);
      client.write(packet, 'utf8', async () => {
        let processedContent = content;
        if (['image', 'video', 'audio'].includes(type) && !content.startsWith('file://')) {
             processedContent = await saveBase64ToDisk(content, type);
        }
        const myMsg: Message = { type, content: processedContent, fileName, sender: 'me', timestamp: new Date() };
        await saveMyMessageToStorage(myMsg);
        client.destroy(); setIsSending(false); 
      });
    });
    client.on('error', (err) => { clearTimeout(connectionTimeout); setIsSending(false); showAlert('Lỗi', 'Gửi thất bại'); });
  };

  const pickAudioFile = async () => {
      setShowAudioMenu(false);
      try {
        const result = await pick({ type: [types.audio], allowMultiSelection: false });
        const res = result[0]; 
        if (!res.uri) return;
        if ((res.size || 0) > 10 * 1024 * 1024) { showAlert('To quá', 'Audio > 10MB.'); return; }
        setIsSending(true);
        const base64Data = await RNFS.readFile(res.uri, 'base64');
        sendPayload(base64Data, 'audio', res.name);
    } catch (err) { if (!JSON.stringify(err).includes("Canceled")) { setIsSending(false); } }
  };

  const startRecording = async () => {
      if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) { showAlert('Lỗi', 'Cần quyền Micro'); return; }
      }
      setIsRecording(true);
      try {
          await audioRecorderPlayer.startRecorder();
          audioRecorderPlayer.addRecordBackListener((e) => {
              setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
          });
      } catch (error) { setIsRecording(false); }
  };

  const stopRecordingAndSend = async () => {
      try {
          const result = await audioRecorderPlayer.stopRecorder();
          audioRecorderPlayer.removeRecordBackListener();
          setIsRecording(false);
          setRecordTime('00:00');
          setShowRecorder(false);
          setIsSending(true);
          const base64Data = await RNFS.readFile(result, 'base64');
          const savedPath = await saveBase64ToDisk(base64Data, 'audio');
          sendPayload(base64Data, 'audio', savedPath);
      } catch (error) { setIsSending(false); showAlert('Lỗi', 'Lỗi ghi âm'); }
  };

  const cancelRecording = async () => {
      try {
          await audioRecorderPlayer.stopRecorder();
          audioRecorderPlayer.removeRecordBackListener();
          setIsRecording(false);
          setRecordTime('00:00');
          setShowRecorder(false);
      } catch (e) {}
  };

  const pickMediaAndSend = async () => {
    if (isSending || isCompressing) return;
    const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.7, includeBase64: false });
    if (result.didCancel || !result.assets) return;
    const asset = result.assets[0];
    let uri = asset.uri; if (!uri) return;
    const isVideo = asset.type?.includes('video');
    const typeToSend = isVideo ? 'video' : 'image';
    setIsSending(true);
    try {
        if (isVideo) {
            setIsCompressing(true);
            const compressedUri = await VideoCompressor.compress(uri, { compressionMethod: 'auto', maxWidth: 480, quality: 0.6 });
            uri = compressedUri; setIsCompressing(false);
        }
        const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
        const base64Data = await RNFS.readFile(cleanUri, 'base64');
        if (base64Data.length > 15 * 1024 * 1024) { showAlert('To quá!', 'Nặng quá.'); setIsSending(false); return; }
        const savedPath = await saveBase64ToDisk(base64Data, typeToSend);
        sendPayload(base64Data, typeToSend, savedPath);
    } catch (error) { setIsCompressing(false); setIsSending(false); showAlert('Lỗi', 'Lỗi file.'); }
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
    if (msg.type === 'video') return <VideoMessage content={msg.content} />;
    if (msg.type === 'audio') return <AudioMessage content={msg.content} />;
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
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setNewName(targetNameState); setShowSettings(true); setIsRenaming(false); }}>
              <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.chatContainer}>
            <ScrollView ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })} contentContainerStyle={{ padding: 15, paddingBottom: 20 }}>
              {messages.length === 0 ? (
                  <View style={styles.emptyState}><Text style={styles.emptyText}>Bắt đầu chat với {targetNameState}</Text></View>
              ) : (
                  messages.map((msg, index) => (
                    <View key={index} style={[styles.bubbleWrapper, msg.sender === 'me' ? styles.meWrapper : styles.otherWrapper]}>
                       <View style={[styles.bubble, msg.sender === 'me' ? styles.meBubble : styles.otherBubble, (msg.type !== 'text') ? { padding: 5, backgroundColor: 'transparent' } : {}]}>
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
                            <TouchableOpacity style={styles.menuItem} onPress={() => setIsRenaming(true)}><Ionicons name="pencil-outline" size={22} color="#333" /><Text style={styles.menuText}>Đổi tên gợi nhớ</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={openDeleteConfirm}><Ionicons name="trash-outline" size={22} color="#ff4d4f" /><Text style={[styles.menuText, {color: '#ff4d4f'}]}>Xóa sạch tin nhắn</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0}]} onPress={copyIpToClipboard}><Ionicons name="copy-outline" size={22} color="#333" /><Text style={styles.menuText}>Copy IP</Text></TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{width: '100%'}}>
                            <Text style={styles.label}>Nhập tên mới:</Text>
                            <TextInput style={styles.renameInput} value={newName} onChangeText={setNewName} placeholder="VD: Bạn hiền" autoFocus />
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc'}]} onPress={() => setIsRenaming(false)}><Text>Hủy</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, {backgroundColor: '#0084ff'}]} onPress={handleRename}><Text style={{color: '#fff', fontWeight: 'bold'}}>Lưu</Text></TouchableOpacity>
                            </View>
                        </View>
                    )}
                    {!isRenaming && <TouchableOpacity style={[styles.cancelBtn, {marginTop: 20}]} onPress={() => setShowSettings(false)}><Text style={styles.cancelText}>Đóng</Text></TouchableOpacity>}
                </View>
            </View>
          </Modal>

          <Modal animationType="fade" transparent={true} visible={showAudioMenu} onRequestClose={() => setShowAudioMenu(false)}>
            <View style={styles.compressOverlay}>
                <View style={styles.settingsBox}>
                    <Text style={styles.settingsTitle}>Gửi âm thanh</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={pickAudioFile}><Ionicons name="musical-notes-outline" size={24} color="#0084ff" /><Text style={styles.menuText}>Chọn file MP3</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, {borderBottomWidth: 0}]} onPress={() => { setShowAudioMenu(false); setTimeout(() => setShowRecorder(true), 300); }}><Ionicons name="mic-outline" size={24} color="#ff4d4f" /><Text style={styles.menuText}>Ghi âm mới</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.cancelBtn, {marginTop: 20}]} onPress={() => setShowAudioMenu(false)}><Text style={styles.cancelText}>Đóng</Text></TouchableOpacity>
                </View>
            </View>
          </Modal>

          <Modal animationType="fade" transparent={true} visible={showRecorder} onRequestClose={() => { if (!isRecording) setShowRecorder(false); }}>
            <View style={styles.compressOverlay}>
                <View style={[styles.settingsBox, {alignItems: 'center'}]}>
                    <Text style={styles.settingsTitle}>{isRecording ? 'Đang ghi âm...' : 'Ghi âm'}</Text>
                    <Text style={{fontSize: 40, fontWeight: 'bold', marginVertical: 20, color: isRecording ? 'red' : '#333'}}>{recordTime}</Text>
                    <View style={styles.modalActions}>
                        {!isRecording ? (
                            <>
                                <TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc'}]} onPress={() => setShowRecorder(false)}><Text>Thoát</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, {backgroundColor: '#ff4d4f'}]} onPress={startRecording}><Text style={{color: '#fff', fontWeight: 'bold'}}>Bắt đầu</Text></TouchableOpacity>
                            </>
                        ) : (
                            <View style={{flexDirection: 'row', width: '100%', justifyContent: 'space-between'}}>
                                <TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc', flex: 0.48}]} onPress={cancelRecording}><Text>Hủy</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, {backgroundColor: '#0084ff', flex: 0.48}]} onPress={stopRecordingAndSend}><Text style={{color: '#fff', fontWeight: 'bold'}}>Gửi</Text></TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
          </Modal>

          <Modal animationType="fade" transparent={true} visible={showDeleteConfirm} onRequestClose={() => setShowDeleteConfirm(false)}><View style={styles.compressOverlay}><View style={[styles.settingsBox, {alignItems: 'center'}]}><Ionicons name="warning-outline" size={50} color="#ff4d4f" style={{marginBottom: 10}} /><Text style={[styles.settingsTitle, {color: '#ff4d4f'}]}>Xóa lịch sử?</Text><View style={styles.modalActions}><TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc'}]} onPress={() => setShowDeleteConfirm(false)}><Text style={{fontWeight: '600'}}>Thôi</Text></TouchableOpacity><TouchableOpacity style={[styles.btn, {backgroundColor: '#ff4d4f'}]} onPress={confirmDelete}><Text style={{color: '#fff', fontWeight: 'bold'}}>Xóa ngay</Text></TouchableOpacity></View></View></View></Modal>
          <Modal animationType="fade" transparent={true} visible={customAlert.visible} onRequestClose={() => setCustomAlert({...customAlert, visible: false})}><View style={styles.compressOverlay}><View style={[styles.settingsBox, {paddingVertical: 25}]}><Text style={styles.settingsTitle}>{customAlert.title}</Text><Text style={{textAlign: 'center', color: '#333', marginBottom: 20, fontSize: 16}}>{customAlert.message}</Text><TouchableOpacity style={[styles.btn, {backgroundColor: '#0084ff', width: '50%'}]} onPress={() => setCustomAlert({...customAlert, visible: false})}><Text style={{color: '#fff', fontWeight: 'bold'}}>OK</Text></TouchableOpacity></View></View></Modal>
          <Modal animationType="fade" transparent={true} visible={isCompressing} onRequestClose={() => {}}><View style={styles.compressOverlay}><View style={styles.compressBox}><Text style={styles.compressTitle}>🎥 Xử lý Video...</Text><ActivityIndicator size="large" color="#0084ff" style={{marginVertical: 20}} /></View></View></Modal>

          <View style={styles.inputArea}>
            <TouchableOpacity style={styles.mediaBtn} onPress={() => setShowAudioMenu(true)} disabled={isSending}>
                <Ionicons name="mic-outline" size={28} color="#0084ff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickMediaAndSend} disabled={isSending}>
                <Ionicons name="images-outline" size={28} color="#0084ff" />
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
  bubble: { maxWidth: SCREEN_WIDTH * 0.75, padding: 10, borderRadius: 15 },
  meBubble: { backgroundColor: '#0084ff', borderBottomRightRadius: 2 },
  otherBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 2 },
  meText: { color: '#fff', fontSize: 16 },
  otherText: { color: '#000', fontSize: 16 },
  mediaMessage: { width: 220, height: 220, borderRadius: 15, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  imageMessage: { width: 220, height: 220, borderRadius: 15 },
  videoPlayer: { width: '100%', height: '100%', borderRadius: 15 },
  audioMessage: { flexDirection: 'row', alignItems: 'center', padding: 5, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.2)' },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  mediaBtn: { padding: 5, marginRight: 5 },
  chatInput: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 15, height: 40, color: '#000', marginRight: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0084ff', justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  compressOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  compressBox: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5 },
  compressTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  compressSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, borderWidth: 1, borderColor: '#ff4d4f' },
  cancelText: { color: '#ff4d4f', fontWeight: 'bold' },
  settingsBox: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 },
  settingsTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#0084ff' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, width: '100%', borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuText: { fontSize: 16, marginLeft: 15, color: '#333', fontWeight: '500' },
  label: { alignSelf: 'flex-start', marginBottom: 5, color: '#666' },
  renameInput: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, fontSize: 16, marginBottom: 15, color: '#333' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  btn: { flex: 0.48, padding: 12, borderRadius: 10, alignItems: 'center' },
});

export default ChatDetailScreen;