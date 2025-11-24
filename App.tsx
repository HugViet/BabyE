import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';

import HomeScreen from './src/HomeScreen';
import MusicScreen from './src/MusicScreen'; 
import StoriesScreen from './src/StoriesScreen';
import VocabScreen from './src/VocabScreen';
import TalkScreen from './src/TalkScreen';
import ChatDetailScreen from './src/ChatDetailScreen'; 
import TcpListener from './src/TcpListener';

const Stack = createNativeStackNavigator();

function RootApp() {
    const handleReceivedMessage = (receivedMessage: string) => {
        console.log("Tin nhắn mới nhận:", receivedMessage.substring(0, 30) + '...');
    };

    return (
        <NavigationContainer>
            <TcpListener onMessage={handleReceivedMessage} /> 
            
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Home" component={TalkScreen} /> 
                {/* <Stack.Screen name="VocabScreen" component={VocabScreen} />
                <Stack.Screen name="MusicScreen" component={MusicScreen} />
                <Stack.Screen name="StoriesScreen" component={StoriesScreen} />
                <Stack.Screen name="TalkScreen" component={TalkScreen} /> */}
                <Stack.Screen name="ChatDetailScreen" component={ChatDetailScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <RootApp />
    </>
  );
}