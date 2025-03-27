"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback, Keyboard
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { db, auth } from "../firebaseConfig"
import * as ImagePicker from "expo-image-picker"
import Modal from "react-native-modal"
import BottomNav from "../assets/BottomNav"

export default function ProfileScreen({ navigation }) {
  // User data state
  const [userData, setUserData] = useState(null)
  const [username, setUsername] = useState("")
  const [phone, setPhone] = useState("")
  const [profileImage, setProfileImage] = useState(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [imageOptionsVisible, setImageOptionsVisible] = useState(false)

  // Error state
  const [error, setError] = useState(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const userId = auth.currentUser.uid
      const userDoc = await getDoc(doc(db, "usuarios", userId))

      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserData(data)
        setUsername(data.username || "")
        setPhone(data.phone || "")
        setProfileImage(data.profileImage || null)
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      setError("No se pudo cargar la información del usuario")
    } finally {
      setLoading(false)
    }
  }

  // Request permissions for image picker
  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (cameraStatus !== "granted" || libraryStatus !== "granted") {
        Alert.alert("Se necesitan permisos para acceder a la cámara y la galería")
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
        setImageOptionsVisible(false)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("No se pudo seleccionar la imagen")
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
        setImageOptionsVisible(false)
      }
    } catch (error) {
      console.error("Error taking photo:", error)
      Alert.alert("No se pudo tomar la foto")
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

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "El nombre de usuario es obligatorio")
      return
    }

    try {
      setSaving(true)
      const userId = auth.currentUser.uid

      // Check if profile image is a new one (starts with file://)
      let profileImageUrl = profileImage
      if (profileImage && profileImage.startsWith("file://")) {
        profileImageUrl = await uploadImageToCloudinary(profileImage)
      }

      // Update user data in Firestore
      await updateDoc(doc(db, "usuarios", userId), {
        username,
        phone,
        profileImage: profileImageUrl,
        updatedAt: new Date().toISOString(),
      })

      Alert.alert("Éxito", "Perfil actualizado correctamente")

      // Update local state
      setUserData({
        ...userData,
        username,
        phone,
        profileImage: profileImageUrl,
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      Alert.alert("Error", "No se pudo actualizar el perfil: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Handle password change
  const handleChangePassword = async () => {
    // Validate passwords
    if (!currentPassword) {
      Alert.alert("Error", "Debes ingresar tu contraseña actual")
      return
    }

    if (!newPassword) {
      Alert.alert("Error", "Debes ingresar una nueva contraseña")
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden")
      return
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres")
      return
    }

    try {
      setChangingPassword(true)

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)

      await reauthenticateWithCredential(auth.currentUser, credential)

      // Change password
      await updatePassword(auth.currentUser, newPassword)

      // Clear form and close modal
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordModalVisible(false)

      Alert.alert("Éxito", "Contraseña actualizada correctamente")
    } catch (error) {
      console.error("Error changing password:", error)

      if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "La contraseña actual es incorrecta")
      } else {
        Alert.alert("Error", "No se pudo actualizar la contraseña: " + error.message)
      }
    } finally {
      setChangingPassword(false)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro que deseas cerrar sesión?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Cerrar sesión",
        onPress: async () => {
          try {
            await signOut(auth)
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            })
          } catch (error) {
            console.error("Error signing out:", error)
            Alert.alert("Error", "No se pudo cerrar sesión: " + error.message)
          }
        },
        style: "destructive",
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#171321" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>


          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImageWrapper}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Feather name="user" size={50} color="#999" />
                  </View>
                )}
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.editImageButton}
                onPress={() => setImageOptionsVisible(true)}
                disabled={uploadingImage}
              >
                <Feather name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Información Personal</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre de usuario</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Ingresa tu nombre"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ingresa tu teléfono"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={saving || uploadingImage}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="save" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.securitySection}>
            <Text style={styles.sectionTitle}>Seguridad</Text>

            <TouchableOpacity style={styles.securityButton} onPress={() => setPasswordModalVisible(true)}>
              <Feather name="lock" size={18} color="#171321" style={styles.buttonIcon} />
              <Text style={styles.securityButtonText}>Cambiar Contraseña</Text>
              <Feather name="chevron-right" size={18} color="#171321" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#FF3B30" style={styles.buttonIcon} />
              <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>

          {/* Add extra padding at the bottom to ensure content is visible above the bottom nav */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Password Change Modal */}
        <Modal
  isVisible={passwordModalVisible}
  onBackdropPress={() => setPasswordModalVisible(false)}
  backdropOpacity={0.5}
  animationIn="slideInUp"
  animationOut="slideOutDown"
  style={styles.modal}
>
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
            <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
              <Feather name="x" size={24} color="#171321" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña actual</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Ingresa tu contraseña actual"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nueva contraseña</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Ingresa tu nueva contraseña"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirmar contraseña</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirma tu nueva contraseña"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPasswordModalVisible(false)}
              disabled={changingPassword}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.changePasswordButton, changingPassword && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.changePasswordButtonText}>Cambiar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
</Modal>

        {/* Image Options Modal */}
        <Modal
          isVisible={imageOptionsVisible}
          onBackdropPress={() => setImageOptionsVisible(false)}
          backdropOpacity={0.5}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          style={styles.modal}
        >
          <View style={styles.imageOptionsContent}>
            <Text style={styles.imageOptionsTitle}>Foto de perfil</Text>

            <TouchableOpacity style={styles.imageOption} onPress={takePhoto}>
              <Feather name="camera" size={20} color="#171321" style={styles.imageOptionIcon} />
              <Text style={styles.imageOptionText}>Tomar foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageOption} onPress={pickImage}>
              <Feather name="image" size={20} color="#171321" style={styles.imageOptionIcon} />
              <Text style={styles.imageOptionText}>Elegir de la galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelImageOption} onPress={() => setImageOptionsVisible(false)}>
              <Text style={styles.cancelImageOptionText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <BottomNav />
    </View>
  )
}

// Update the styles object to match the app's design
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Extra padding to account for bottom nav
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#1E5F74",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 10,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F9F9F9",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#F0F0F0",
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
    backgroundColor: "#F9F9F9",
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
  editImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6B6B",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 4,
  },
  emailText: {
    fontSize: 16,
    color: "#555",
  },
  formSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  securitySection: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomPadding: {
    height: 80, // Extra padding at the bottom to ensure content is visible above the bottom nav
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#1E5F74",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  securityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  securityButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FFE0E0",
  },
  logoutButtonText: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "bold",
    marginLeft: 8,
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginRight: 10,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
  changePasswordButton: {
    flex: 1,
    backgroundColor: "#1E5F74",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginLeft: 10,
  },
  changePasswordButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  imageOptionsContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  imageOptionsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  imageOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  imageOptionIcon: {
    marginRight: 12,
  },
  imageOptionText: {
    fontSize: 16,
    color: "#333",
  },
  cancelImageOption: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    marginTop: 8,
    alignItems: "center",
  },
  cancelImageOptionText: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "bold",
  },
})

