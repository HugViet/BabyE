import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { View, Text, Pressable, StyleSheet, FlatList, ImageBackground } from "react-native";

const SONGS = [
  { id: "1", title: "Bài hát 1" },
  { id: "2", title: "Bài hát 2" },
  { id: "3", title: "Bài hát 3" },
  { id: "4", title: "Bài hát 4" },
  { id: "5", title: "Bài hát 5" },
  { id: "6", title: "Bài hát 6" },
  { id: "7", title: "Bài hát 7" },
  { id: "8", title: "Bài hát 8" },
  { id: "9", title: "Bài hát 9" },
];

export default function MusicScreen() {
  const navigation = useNavigation();
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const [sortAsc, setSortAsc] = useState(true);

  const data = useMemo(() => {
    const arr = [...SONGS];
    arr.sort((a, b) =>
      sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    );
    return arr;
  }, [sortAsc]);

  return (
    <ImageBackground
      source={require("../image/music/background_music.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={s.root}>
        {/* Top bar */}
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={s.title}>Nghe nhạc</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Controls */}
        <Text style={s.caption}>Sắp xếp theo: Tên</Text>
        <View style={s.controls}>
          <Pressable onPress={() => setSortAsc(!sortAsc)} style={s.chip}>
            <Ionicons name="text-outline" size={16} color="#fff" />
            <Text style={s.chipText}>{sortAsc ? "A↓" : "A↑"}</Text>
          </Pressable>
          <Pressable style={s.chip}>
            <Ionicons name="filter-outline" size={16} color="#fff" />
            <Text style={s.chipText}>Filter</Text>
          </Pressable>
        </View>

        {/* List */}
        <FlatList
          data={data}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const liked = !!favorites[item.id];
            const isPlaying = !!playing[item.id];
            return (
              <View style={s.card}>
                <Text style={s.cardTitle}>{item.title}</Text>

                <View style={s.actions}>
                  <Pressable style={s.smallBtn}>
                    <Ionicons name="play-skip-back" size={18} color="#fff" />
                  </Pressable>

                  <Pressable
                    style={s.smallBtn}
                    onPress={() =>
                      setPlaying((p) => ({ ...p, [item.id]: !p[item.id] }))
                    }
                  >
                    <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#fff" />
                  </Pressable>

                  <Pressable style={s.smallBtn}>
                    <Ionicons name="play-skip-forward" size={18} color="#fff" />
                  </Pressable>

                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      setFavorites((f) => ({ ...f, [item.id]: !f[item.id] }))
                    }
                    style={s.likeBtn}
                  >
                    <Ionicons
                      name={liked ? "heart" : "heart-outline"}
                      size={22}
                      color={liked ? "#ff4d4f" : "#fff"}
                    />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 12 },
  title: { color: "#235cceda", fontSize: 28, fontWeight: "800" },
  iconBtn: { height: 42, width: 42, borderRadius: 12, backgroundColor: "#49b1e1a1", justifyContent: "center", alignItems: "center" },
  caption: { color: "#f9e252da", marginBottom: 8, fontSize: 20 },
  controls: { flexDirection: "row", gap: 10, marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#40a4d2ff", borderRadius: 12 },
  chipText: { color: "#fff", fontWeight: "700" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#40a4d2ad", borderRadius: 16, paddingHorizontal: 14, height: 72, marginBottom: 12 },
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "700", flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  smallBtn: { height: 36, width: 36, borderRadius: 18, backgroundColor: "#1760e651", borderWidth: 1, borderColor: "#a4b9f5ff", justifyContent: "center", alignItems: "center" },
  likeBtn: { height: 36, width: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
});