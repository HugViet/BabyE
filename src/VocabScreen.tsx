import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { View, Text, Pressable, StyleSheet, ImageBackground, Image } from "react-native";

export default function VocabScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<"ENG" | "VN">("ENG");

  return (
    <ImageBackground
      source={require("../image/vocab/background_vocab.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Từ vựng</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.imageBox}>
          <Image
            source={require("../image/vocab/aplpe.jpg")}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>

        <View style={styles.rowGap}>
          <Pressable style={styles.pillBtn}>
            <Text style={styles.pillText}>Từ</Text>
          </Pressable>
          <Pressable style={styles.pillBtn}>
            <Text style={styles.pillText}>Phát âm</Text>
          </Pressable>
        </View>

        <View style={styles.segment}>
          <Pressable
            onPress={() => setTab("ENG")}
            style={[styles.segmentItem, tab === "ENG" && styles.segmentActive]}
          >
            <Text style={tab === "ENG" ? styles.segmentActiveText : styles.segmentText}>ENG</Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("VN")}
            style={[styles.segmentItem, tab === "VN" && styles.segmentActive]}
          >
            <Text style={tab === "VN" ? styles.segmentActiveText : styles.segmentText}>VN</Text>
          </Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Pressable style={styles.circleBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>

          <Pressable style={styles.circleBtn}>
            <Ionicons name="volume-high" size={24} color="#fff" />
          </Pressable>

          <Pressable style={styles.circleBtn}>
            <Ionicons name="mic" size={24} color="#fff" />
          </Pressable>

          <Pressable style={styles.circleBtn}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />   
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 18 },
  headerTitle: { color: "#a835deff", fontSize: 28, fontWeight: "800" },
  iconBtn: { height: 42, width: 42, borderRadius: 12, backgroundColor: "#bea6ceff", borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  imageBox: { height: 360, borderRadius: 18, borderWidth: 1, overflow: "hidden", borderColor: "#2a2a2a", backgroundColor: "#131313", justifyContent: "center", alignItems: "center", marginBottom: 22 },
  rowGap: { gap: 12, marginBottom: 16 },
  pillBtn: { backgroundColor: "rgba(0,0,0,0.3)", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 14, paddingVertical: 25, paddingHorizontal: 18 },
  pillText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  segment: { flexDirection: "row", backgroundColor: "rgba(188, 126, 165, 0.41)", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 14, overflow: "hidden", marginBottom: 28, height: 74 },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  segmentText: { color: "#080808ff", fontSize: 15, fontWeight: "700" },
  segmentActive: { backgroundColor: "rgba(144, 85, 199, 0.91)" },
  segmentActiveText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  bottomRow: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", width: "100%", marginTop: "auto", marginBottom: 56 },
  circleBtn: { height: 56, width: 56, borderRadius: 999, backgroundColor: "rgba(149, 68, 211, 0.3)", borderWidth: 1, borderColor: "#c6aed7ff", justifyContent: "center", alignItems: "center" },
});