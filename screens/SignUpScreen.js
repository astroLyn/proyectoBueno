import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { auth } from "../firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: "830529089599-3gc714c6p6qvcq3po5qvcfa0okl76js6.apps.googleusercontent.com"
  });

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigation.replace("UserData");
    } catch (error) {
      console.error("Signup error:", error);
      alert("Error al registrarse: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await promptAsync();
      if (result?.type === "success") {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        await signInWithCredential(auth, credential);
        navigation.replace("UserData");
      }
    } catch (error) {
      console.error("Google Signup error:", error);
      alert("Error al registrarse con Google");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Ingresa tus datos para comenzar</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creando cuenta..." : "Registrarse"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignup}
        >
          <Text style={styles.googleButtonText}>Registrarse con Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.linkText}>
            ¿Ya tienes una cuenta? Inicia sesión
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Blanco como fondo principal
    justifyContent: "center",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#171321", // Púrpura oscuro para el título
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#333", // Gris oscuro para el subtítulo
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F2F2F2", // Gris claro para el fondo del input
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: "#171321", // Púrpura oscuro para el texto del input
  },
  button: {
    backgroundColor: "#171321", // Púrpura oscuro para el botón principal
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "#e57373", // Rojo claro, para el google button
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: "#171321", // Púrpura oscuro para el texto del enlace
    fontSize: 16,
  },
});

