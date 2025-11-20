import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { View, Text, Pressable, StyleSheet, FlatList, ImageBackground } from "react-native";

const STORIES = [
  { id: "1", title: "Truyện 1" },
  { id: "2", title: "Truyện 2" },
  { id: "3", title: "Truyện 3" },
  { id: "4", title: "Truyện 4" },
  { id: "5", title: "Truyện 5" },
];

export default function StoriesScreen() {
  const navigation = useNavigation();
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [sortAsc, setSortAsc] = useState(true);

  const data = useMemo(() => {
    const arr = [...STORIES];
    arr.sort((a, b) =>
      sortAsc
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title)
    );
    return arr;
  }, [sortAsc]);

  return (
    <ImageBackground
      source={require("../image/stories/background_stories.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={s.root}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>

          <Text style={s.title}>Đọc truyện</Text>
          <View style={{ width: 42 }} />
        </View>

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

        <FlatList
          data={data}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const liked = !!favorites[item.id];
            return (
              <View style={s.card}>
                <Text style={s.cardTitle}>{item.title}</Text>
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
  title: { color: "#992a85ff", fontSize: 28, fontWeight: "800" },
  iconBtn: { height: 42, width: 42, borderRadius: 12, backgroundColor: "#5615686b", justifyContent: "center", alignItems: "center" },
  controls: { flexDirection: "row", gap: 10, marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#a611ba8a", borderRadius: 12 },
  chipText: { color: "#fff", fontWeight: "700" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#763282d0", borderRadius: 18, paddingHorizontal: 14, height: 72, marginBottom: 12 },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 },
  likeBtn: { height: 36, width: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
});