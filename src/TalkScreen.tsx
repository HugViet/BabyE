import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View,
  Platform, FlatList, Modal, ImageBackground, Alert
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'SAVED_CONTACTS';

interface Contact {
  id: string;
  name: string;
  ip: string;
}

function TalkScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  
  const [myIp, setMyIp] = useState<string>('Đang lấy...');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputIp, setInputIp] = useState('');

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    NetInfo.fetch().then(state => {
      if (state.details && 'ipAddress' in state.details) {
        setMyIp((state.details as any).ipAddress);
      }
    });
    loadContacts(); 
  }, []);

  const loadContacts = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) setContacts(JSON.parse(jsonValue));
    } catch(e) {}
  };

  const addContact = async () => {
    if (!inputIp.trim()) {
      Alert.alert('Thiếu thông tin', 'IP không được để trống.');
      return;
    }

    const finalName = inputName.trim() ? inputName.trim() : inputIp.trim();

    const newContact = { id: Date.now().toString(), name: finalName, ip: inputIp.trim() };
    const newList = [...contacts, newContact];
    
    setContacts(newList);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    
    setModalVisible(false);
    setInputName('');
    setInputIp('');
  };

  const promptDelete = (id: string) => {
      setContactToDelete(id); 
      setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
      if (!contactToDelete) return;
      const id = contactToDelete;

      const contactObj = contacts.find(c => c.id === id);
      
      const newList = contacts.filter(c => c.id !== id);
      setContacts(newList);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newList));

      if (contactObj) {
          const CHAT_STORAGE_KEY = `@chat_${contactObj.ip}`;
          try { await AsyncStorage.removeItem(CHAT_STORAGE_KEY); } catch (e) {}
      }

      setDeleteModalVisible(false);
      setContactToDelete(null);
  };

  const goToChat = (contact: Contact) => {
      navigation.navigate('ChatDetailScreen', { targetIp: contact.ip, targetName: contact.name });
  }

  return (
    <ImageBackground source={require('../image/talk/background_talk.jpg')} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Danh bạ</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconBtn}>
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>

        <FlatList
            data={contacts}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
                <TouchableOpacity style={styles.card} onPress={() => goToChat(item)}>
                    <View style={{ flex: 1, marginLeft: 5 }}>
                        <Text style={styles.cardName}>{item.name}</Text>
                        <Text style={styles.cardIp}>IP: {item.ip}</Text>
                    </View>
                    <TouchableOpacity onPress={() => promptDelete(item.id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={22} color="#ff4d4f" />
                    </TouchableOpacity>
                </TouchableOpacity>
            )}
            ListEmptyComponent={
                <Text style={styles.emptyText}>Chưa có ai cả. Bấm dấu + để thêm bạn!</Text>
            }
        />

        <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Thêm bạn mới</Text>
              
              <View style={styles.myIpBox}>
                  <Text style={{color: '#666'}}>IP của bạn:</Text>
                  <Text style={{fontWeight: 'bold', color: '#bd6ce2ff'}}>{myIp}</Text>
              </View>

              <Text style={styles.label}>IP cần Add:</Text>
              <TextInput style={styles.input} value={inputIp} onChangeText={setInputIp} keyboardType="numeric" placeholder="192.168..." />

              <Text style={styles.label}>Tên gợi nhớ:</Text>
              <TextInput style={styles.input} value={inputName} onChangeText={setInputName} placeholder="VD: Bạn hiền" />

              <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc'}]} onPress={() => setModalVisible(false)}>
                      <Text>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, {backgroundColor: '#bd6ce2ff'}]} onPress={addContact}>
                      <Text style={{color: '#fff', fontWeight: 'bold'}}>Lưu</Text>
                  </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal animationType="fade" transparent={true} visible={deleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalView, {alignItems: 'center'}]}>
                    <Ionicons name="warning" size={50} color="#ff4d4f" style={{marginBottom: 15}} />
                    <Text style={[styles.modalTitle, {color: '#ff4d4f'}]}>Xóa liên hệ?</Text>
                    <Text style={{textAlign: 'center', color: '#555', marginBottom: 20, fontSize: 16}}>
                        Bạn có chắc muốn xóa người này khỏi danh bạ không? Lịch sử chat cũng sẽ bị xóa vĩnh viễn.
                    </Text>
                    
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc'}]} onPress={() => setDeleteModalVisible(false)}>
                            <Text style={{fontWeight: '600'}}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, {backgroundColor: '#ff4d4f'}]} onPress={confirmDelete}>
                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Xóa luôn</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: 15, borderRadius: 18, marginBottom: 12 },
  cardName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardIp: { fontSize: 14, color: '#666', marginTop: 2 },
  deleteBtn: { padding: 10 },
  emptyText: { textAlign: 'center', color: '#fff', marginTop: 50, fontSize: 16 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  myIpBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f0f2f5', padding: 10, borderRadius: 8, marginBottom: 15 },
  label: { marginBottom: 5, color: '#333', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, marginBottom: 15, fontSize: 16, color: '#333' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  btn: { flex: 0.48, padding: 12, borderRadius: 10, alignItems: 'center' },
});

export default TalkScreen;