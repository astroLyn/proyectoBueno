"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Platform } from "react-native"
import { doc, setDoc } from "firebase/firestore"
import { db, auth } from "../firebaseConfig"
import * as ImagePicker from "expo-image-picker"
import { Feather } from "@expo/vector-icons"

export default function UserDataScreen({ navigation }) {
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Request permissions for image picker
  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (cameraStatus !== "granted" || libraryStatus !== "granted") {
        alert("Se necesitan permisos para acceder a la cámara y la galería")
        return false
      }
      return true
    }
    return true
  }

  // Pick image from gallery
  const pickImage = async () => {
    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      alert("No se pudo seleccionar la imagen")
    }
  }

  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error taking photo:", error)
      alert("No se pudo tomar la foto")
    }
  }

  // Upload image to Cloudinary
  const uploadImageToCloudinary = async (uri) => {
    try {
      setUploadingImage(true)

      // Create form data for upload
      const formData = new FormData()

      // Get file extension
      const uriParts = uri.split(".")
      const fileType = uriParts[uriParts.length - 1]

      // Add image to form data
      formData.append("file", {
        uri,
        name: `profile_${auth.currentUser.uid}_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      })

      // Add upload preset (you need to create this in your Cloudinary account)
      formData.append("upload_preset", "datosproyecto")
      formData.append("folder", "proyecto4d/usuarios")

      // Upload to Cloudinary
      const response = await fetch("https://api.cloudinary.com/v1_1/doze2qu0s/image/upload", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      })

      const data = await response.json()

      if (response.ok) {
        return data.secure_url
      } else {
        throw new Error(data.error?.message || "Error al subir imagen a Cloudinary")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      throw error
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async () => {
    if (!username.trim() || !phone.trim()) {
      alert("Por favor completa todos los campos")
      return
    }

    setLoading(true)
    try {
      const userId = auth.currentUser.uid

      // Upload profile image if selected
      let profileImageUrl = null
      if (profileImage) {
        profileImageUrl = await uploadImageToCloudinary(profileImage)
      }

      // Guardar datos adicionales del usuario en Firestore
      await setDoc(doc(db, "usuarios", userId), {
        username,
        phone,
        email: auth.currentUser.email,
        profileImage: profileImageUrl,
        createdAt: new Date().toISOString(),
      })

      navigation.replace("Home") // Navigate to MainApp instead of Home to use the tab navigation
    } catch (error) {
      console.error("Error saving user data:", error)
      alert("Error al guardar los datos: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Completa tu perfil</Text>
        <Text style={styles.subtitle}>Solo unos datos más para comenzar</Text>

        <View style={styles.profileImageContainer}>
          <View style={styles.profileImageWrapper}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Feather name="user" size={40} color="#999" />
              </View>
            )}
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto} disabled={loading || uploadingImage}>
              <Feather name="camera" size={20} color="#171321" />
              <Text style={styles.imageButtonText}>Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageButton} onPress={pickImage} disabled={loading || uploadingImage}>
              <Feather name="image" size={20} color="#171321" />
              <Text style={styles.imageButtonText}>Galería</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Nombre de usuario"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Número de teléfono"
          placeholderTextColor="#999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={[styles.button, (loading || uploadingImage) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || uploadingImage}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Continuar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#171321",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  imageButtonText: {
    color: "#171321",
    marginLeft: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: "#F2F2F2",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: "#171321",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  button: {
    backgroundColor: "#171321",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    height: 56,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})

