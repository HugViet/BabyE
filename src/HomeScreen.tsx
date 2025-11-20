import React from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { View, Text, Pressable, StyleSheet, ImageBackground } from "react-native";

function Tile({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      <Text style={styles.tileText}>{title}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <ImageBackground
      source={require("../image/home/background.jpg")} 
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.root}>
        <View style={styles.heroBox}>
          <ImageBackground
              source={require("../image/home/banner.jpg")} 
              style={{width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center'}}
              resizeMode="cover"
          >
          </ImageBackground>
        </View>

        <View style={styles.grid}>
          <Tile title="Từ vựng" onPress={() => navigation.navigate("VocabScreen")} />
          <Tile title="Nghe nhạc" onPress={() => navigation.navigate("MusicScreen")} />
          <Tile title="Đọc truyện" onPress={() => navigation.navigate("StoriesScreen")} />
          <Tile title="Trò chuyện" onPress={() => navigation.navigate("TalkScreen")} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    paddingHorizontal: 20, 
    paddingTop: 6, 
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 16,
  },
  heroBox: {
    height: 360,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 40,
    overflow: 'hidden',
  },
  grid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    justifyContent: "space-between" 
  },
  tile: {
    width: "48%",
    height: 110,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 18,
    marginBottom: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  tileText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "700" 
  },
});