import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { initializeApp } from "@firebase/app"
import { getAuth } from "@firebase/auth"

import LoginScreen from "../proyecto/screens/LoginScreen"
import SignupScreen from "../proyecto/screens/SignUpScreen"
import HomeScreen from "../proyecto/screens/HomeScreen"
import InfoProyectosScreen from "./screens/InfoProyectosScreen"
import UserDataScreen from "./screens/UserDataScreen"
import NotificacionesScreen from './screens/NotificacionesScreen';
import ProyectosArchivadosScreen from "./screens/ProyectosArchivadosScreen"
import ListaTareasScreen from "./screens/ListaTareasScreen"
import ProfileScreen from "./screens/perfilScreen"
const firebaseConfig = {
  apiKey: "AIzaSyD5L-ZlC9dNLUJgReNUWsPz3ChaGyjvtLo",
  authDomain: "proyecto4d-29047.firebaseapp.com",
  projectId: "proyecto4d-29047",
  storageBucket: "proyecto4d-29047.firebasestorage.app",
  messagingSenderId: "830529089599",
  appId: "1:830529089599:web:ad61b3a13c9ddee751888a",
  measurementId: "G-67TS3HF7JV",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

const Stack = createStackNavigator()

export default function App() {
  return (
<NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="UserData" component={UserDataScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="InfoProyectos" component={InfoProyectosScreen} />
        <Stack.Screen name="Proyectos" component={ProyectosArchivadosScreen} />
        <Stack.Screen name="Notificaciones" component={NotificacionesScreen} />
        <Stack.Screen name="Perfi" component={ProfileScreen} />
        <Stack.Screen name="ListaTareas" component={ListaTareasScreen} options={{ headerShown: false }}
/>
      </Stack.Navigator>
    </NavigationContainer>
    
  )
}


