import React, { useState, useEffect, createContext, useContext } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Button, Switch, FlatList, Image, TouchableOpacity, ScrollView, Dimensions, TextInput } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

type Session = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  route: { latitude: number; longitude: number }[];
  photo?: string;
  note?: string;
};

// Context to hold sessions globally
const SessionsContext = createContext<{
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
}>({ sessions: [], setSessions: () => {} });

// Initial dummy sessions
const initialSessions: Session[] = [
  {
    id: '1',
    name: 'Home → Park',
    start: new Date(2025, 4, 20, 10, 0),
    end: new Date(2025, 4, 20, 11, 30),
    route: [
      { latitude: 37.78825, longitude: -122.4324 },
      { latitude: 37.78925, longitude: -122.4334 }
    ],
    photo: 'https://placekitten.com/400/300',
    note: 'Fun picnic vibes!'
  }
];

// HomeScreen omitted for brevity
const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [isTogether, setIsTogether] = useState<boolean>(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTogether && sessionStart) {
      timer = setInterval(() => setDuration(Math.floor((Date.now() - sessionStart.getTime()) / 1000)), 1000);
    }
    return () => clearInterval(timer);
  }, [isTogether, sessionStart]);

  const handleSessionToggle = () => {
    if (!isTogether) {
      setSessionStart(new Date());
      setIsTogether(true);
    } else {
      setIsTogether(false);
      setDuration(0);
      navigation.navigate('Map');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.status}>{isTogether ? '❤️ Active Session' : '💔 No Active Session'}</Text>
      {isTogether && sessionStart && (
        <Text style={styles.substatus}>
          Since {sessionStart.toLocaleTimeString()} ({Math.floor(duration / 60)}m {duration % 60}s)
        </Text>
      )}
      <View style={styles.toggle}>
        <Button title={isTogether ? 'End Session' : 'Start Session'} onPress={handleSessionToggle} />
      </View>
      {/* dev-only toggles omitted */}
      <View style={styles.buttons}>
        <Button title="Map History" onPress={() => navigation.navigate('Map')} />
        <Button title="Memory Wall" onPress={() => navigation.navigate('History')} />
      </View>
    </SafeAreaView>
  );
};

const MapScreen: React.FC = () => {
  const [viewList, setViewList] = useState<boolean>(false);
  const { sessions } = useContext(SessionsContext);

  return (
    <SafeAreaView style={styles.container}>
      {/* map/list toggle */}
      <View style={styles.toggleContainer}>
        <Text>List</Text>
        <Switch value={viewList} onValueChange={setViewList} />
        <Text>Map</Text>
      </View>
      {viewList ? (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.sessionItem}>
              <Text style={styles.sessionTitle}>{item.name}</Text>
              <Text>{item.start.toLocaleDateString()} | {Math.floor((item.end.getTime() - item.start.getTime()) / 60000)}m</Text>
            </View>
          )}
        />
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: sessions[0].route[0].latitude,
            longitude: sessions[0].route[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          }}
        >
          {sessions.map(s => (
            <Polyline key={s.id} coordinates={s.route} strokeWidth={4} />
          ))}
        </MapView>
      )}
    </SafeAreaView>
  );
};

// DetailScreen with edit capabilities
const DetailScreen: React.FC<{ route: any }> = ({ route }) => {
  const { sessions, setSessions } = useContext(SessionsContext);
  const { sessionId } = route.params as { sessionId: string };
  const session = sessions.find(s => s.id === sessionId)!;
  const [editing, setEditing] = useState(false);
  const [newNote, setNewNote] = useState(session.note || '');
  const [newPhoto, setNewPhoto] = useState<string | undefined>(session.photo);

  // Sync local state when session updates
  useEffect(() => {
    setNewNote(session.note || '');
    setNewPhoto(session.photo);
  }, [session]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7
    });
    if (!result.canceled) {
      const uri = result.assets ? result.assets[0].uri : result.uri;
      setNewPhoto(uri);
    }
  };

  const handleSave = () => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, note: newNote, photo: newPhoto } : s));
    setEditing(false);
  };

  const { width, height } = Dimensions.get('window');
  return (
    <ScrollView contentContainerStyle={styles.detailContainer}>
      {(!editing && session.photo) || (editing && newPhoto) ? (
        <Image source={{ uri: editing ? newPhoto! : session.photo! }} style={[styles.photo, { width: width - 32 }]} />
      ) : null}
      <Text style={styles.sessionTitle}>{session.name}</Text>
      {!editing && session.note && <Text style={styles.note}>{session.note}</Text>}\
      {editing && (
        <TextInput
          style={styles.input}
          multiline
          placeholder="Enter a note..."
          value={newNote}
          onChangeText={setNewNote}
        />
      )}
      <Text>{session.start.toLocaleString()} - {session.end.toLocaleString()}</Text>
      {!editing ? (
        <Button title="Edit Memory" onPress={() => setEditing(true)} />
      ) : (
        <View style={styles.editButtons}>
          <Button title="Pick Photo" onPress={pickImage} />
          <Button title="Save" onPress={handleSave} />
          <Button title="Cancel" onPress={() => setEditing(false)} />
        </View>
      )}
      <MapView
        style={{ width: width - 32, height: height / 3, marginVertical: 16 }}
        initialRegion={{
          latitude: session.route[0].latitude,
          longitude: session.route[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }}
      >
        <Polyline coordinates={session.route} strokeWidth={4} />
        <Marker coordinate={session.route[0]} />
        <Marker coordinate={session.route[session.route.length - 1]} />
      </MapView>
    </ScrollView>
  );
};

// History screen shows list and navigates to detail
const HistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { sessions } = useContext(SessionsContext);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('Detail', { sessionId: item.id })}>
            <View style={styles.trackContainer}>
              {item.photo && <Image source={{ uri: item.photo }} style={styles.photo} />}
              <Text style={styles.sessionTitle}>{item.name}</Text>
              {item.note && <Text style={styles.note}>{item.note}</Text>}
              <Text>{item.start.toLocaleDateString()} - {item.end.toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

// App navigator and context provider
const App: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);

  return (
    <SessionsContext.Provider value={{ sessions, setSessions }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
          <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Sessions Map' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Memory Wall' }} />
          <Stack.Screen name="Detail" component={DetailScreen} options={{ title: 'Session Detail' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SessionsContext.Provider>
  );
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  status: { fontSize: 24, textAlign: 'center', marginVertical: 8 },
  substatus: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  toggle: { marginVertical: 16, alignItems: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 8 },
  map: { flex: 1 },
  sessionItem: { padding: 12, borderBottomWidth: 1, borderColor: '#ccc' },
  sessionTitle: { fontSize: 18, fontWeight: 'bold' },
  trackContainer: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  photo: { height: 150, borderRadius: 8, marginBottom: 8 },
  note: { fontStyle: 'italic', marginBottom: 8 },
  detailContainer: { alignItems: 'center', padding: 16 },
  input: { width: '100%', borderColor: '#ccc', borderWidth: 1, borderRadius: 8, padding: 8, marginVertical: 8, minHeight: 60 },
  editButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 8 }
});
