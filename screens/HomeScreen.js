import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, StatusBar } from "react-native"
import { signOut } from "@firebase/auth"
import { auth } from "../firebaseConfig"
import BottomNav from "../assets/BottomNav"
import { useEffect, useState } from "react"
import { crearProyecto, obtenerProyectos, actualizarProyecto, eliminarProyecto } from "../proyectosService"
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view"
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const [proyectos, setProyectos] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [nuevoProyecto, setNuevoProyecto] = useState({
    nombre: "",
    ubicacion: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "En Progreso",
    cliente: "",
    descripcion: "",
  })

  useEffect(() => {
    cargarProyectos()
  }, [])

  const cargarProyectos = async () => {
    try {
      const datos = await obtenerProyectos()
      setProyectos(datos)
    } catch (error) {
      alert("Error al cargar proyectos: " + error.message)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigation.replace("Login")
    } catch (error) {
      console.error("Logout error:", error)
      alert("Error al cerrar sesión: " + error.message)
    }
  }

  // Función para formatear la fecha de YYYY-MM-DD a DD-MM-YYYY
  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    const partes = fecha.split("-");
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    return fecha;
  }

  // Función para manejar la entrada de fecha con formato automático
  const handleFechaInput = (text) => {
    // Eliminar cualquier carácter que no sea número
    let cleaned = text.replace(/[^0-9]/g, '');
    
    // Aplicar formato automático
    if (cleaned.length <= 2) {
      setNuevoProyecto({ ...nuevoProyecto, fechaFin: cleaned });
    } else if (cleaned.length <= 4) {
      setNuevoProyecto({ 
        ...nuevoProyecto, 
        fechaFin: cleaned.substring(0, 2) + '-' + cleaned.substring(2) 
      });
    } else {
      setNuevoProyecto({ 
        ...nuevoProyecto, 
        fechaFin: cleaned.substring(0, 2) + '-' + cleaned.substring(2, 4) + '-' + cleaned.substring(4, 8) 
      });
    }
  }

  // Función para validar si una fecha es mayor a la fecha actual
  const esFechaMayorAHoy = (fechaStr) => {
    // Verificar formato DD-MM-YYYY
    if (!fechaStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return false;
    }
    
    // Convertir de DD-MM-YYYY a objeto Date
    const partes = fechaStr.split('-');
    const fecha = new Date(
      parseInt(partes[2]), // Año
      parseInt(partes[1]) - 1, // Mes (0-11)
      parseInt(partes[0]) // Día
    );
    
    // Obtener fecha actual sin horas/minutos/segundos
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Comparar
    return fecha > hoy;
  }

  const manejarAgregarProyecto = async () => {
    // Validate all required fields
    if (
      !nuevoProyecto.nombre.trim() ||
      !nuevoProyecto.ubicacion.trim() ||
      !nuevoProyecto.fechaFin.trim() ||
      !nuevoProyecto.cliente.trim() ||
      !nuevoProyecto.descripcion.trim()
    ) {
      alert("Es necesario rellenar los campos.")
      return
    }

    // Validar que la fecha de finalización sea mayor a la fecha actual
    if (!esFechaMayorAHoy(nuevoProyecto.fechaFin)) {
      alert("La fecha de finalización debe ser posterior a la fecha actual.")
      return
    }

    try {
      // Convertir la fecha de fin de DD-MM-YYYY a YYYY-MM-DD para almacenarla
      let fechaFinFormateada = nuevoProyecto.fechaFin;
      if (fechaFinFormateada.includes('-')) {
        const partes = fechaFinFormateada.split('-');
        if (partes.length === 3) {
          fechaFinFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
      }

      // Obtener la fecha actual en formato DD-MM-YYYY
      const hoy = new Date();
      const fechaInicioFormateada = `${hoy.getDate().toString().padStart(2, '0')}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getFullYear()}`;
      
      // Convertir a YYYY-MM-DD para almacenar en la base de datos
      const fechaInicioDB = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;

      // Set the current date as the start date
      const proyectoCompleto = {
        ...nuevoProyecto,
        fechaInicio: fechaInicioDB,
        fechaFin: fechaFinFormateada
      }

      await crearProyecto(proyectoCompleto)
      setModalVisible(false)
      setNuevoProyecto({
        nombre: "",
        ubicacion: "",
        fechaInicio: "",
        fechaFin: "",
        estado: "En Progreso",
        cliente: "",
        descripcion: "",
      })
      cargarProyectos()
    } catch (error) {
      alert("Error al crear el proyecto: " + error.message)
    }
  }

  const manejarActualizarProyecto = async (id) => {
    try {
      await actualizarProyecto(id, { estado: "Finalizado" })
      cargarProyectos()
    } catch (error) {
      alert("Error al actualizar el proyecto: " + error.message)
    }
  }

  const manejarEliminarProyecto = async (id) => {
    try {
      await eliminarProyecto(id)
      cargarProyectos()
    } catch (error) {
      alert("Error al eliminar el proyecto: " + error.message)
    }
  }

  const verDetallesProyecto = (proyecto) => {
    navigation.navigate("InfoProyectos", { proyecto })
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E5F74" barStyle="light-content" />
      
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mis Proyectos</Text>
        </View>
      </View>
      
      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Nuevo Proyecto</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
      >
        {proyectos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="clipboard-list" size={60} color="#BBBBBB" />
            <Text style={styles.emptyText}>No hay proyectos disponibles</Text>
            <Text style={styles.emptySubText}>Crea tu primer proyecto usando el botón "Nuevo Proyecto"</Text>
          </View>
        ) : (
          proyectos.map((proyecto) => (
            <TouchableOpacity 
              key={proyecto.id} 
              style={styles.card}
              onPress={() => verDetallesProyecto(proyecto)}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{proyecto.nombre}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: proyecto.estado === "Finalizado" ? "#4CAF50" : "#FF9800" },
                ]}>
                  <Text style={styles.statusText}>{proyecto.estado}</Text>
                </View>
              </View>
              
              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <Feather name="user" size={16} color="#1E5F74" />
                  <Text style={styles.infoText}>{proyecto.cliente}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Feather name="map-pin" size={16} color="#1E5F74" />
                  <Text style={styles.infoText}>{proyecto.ubicacion}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Feather name="calendar" size={16} color="#1E5F74" />
                  <Text style={styles.infoText}>Finaliza: {formatearFecha(proyecto.fechaFin)}</Text>
                </View>
              </View>
              
              <View style={styles.cardFooter}>
                <Text style={styles.viewDetailsText}>Ver detalles</Text>
                <Feather name="chevron-right" size={18} color="#1E5F74" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAwareScrollView contentContainerStyle={styles.modalScrollContainer}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nuevo Proyecto</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Feather name="x" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre del proyecto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Construcción Residencial Torres del Valle"
                  placeholderTextColor="#999"
                  value={nuevoProyecto.nombre}
                  onChangeText={(text) => setNuevoProyecto({ ...nuevoProyecto, nombre: text })}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ubicación</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Av. Principal #123, Ciudad"
                  placeholderTextColor="#999"
                  value={nuevoProyecto.ubicacion}
                  onChangeText={(text) => setNuevoProyecto({ ...nuevoProyecto, ubicacion: text })}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Fecha de finalización (DD-MM-YYYY)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#999"
                  value={nuevoProyecto.fechaFin}
                  onChangeText={handleFechaInput}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cliente</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Inmobiliaria Moderna S.A."
                  placeholderTextColor="#999"
                  value={nuevoProyecto.cliente}
                  onChangeText={(text) => setNuevoProyecto({ ...nuevoProyecto, cliente: text })}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe los detalles importantes del proyecto..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={nuevoProyecto.descripcion}
                  onChangeText={(text) => setNuevoProyecto({ ...nuevoProyecto, descripcion: text })}
                />
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]} 
                  onPress={manejarAgregarProyecto}
                >
                  <Text style={styles.saveButtonText}>Guardar Proyecto</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </Modal>

      <BottomNav />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  headerContainer: {
    backgroundColor: "#1E5F74",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 15, // Cambiado de -20 a 15 para bajar el botón
    zIndex: 10,
  },
  addButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
    paddingTop: 10, // Añadido para dar más espacio después del botón
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  cardContent: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#1E5F74",
    fontWeight: "bold",
    marginRight: 5,
  },
  modalScrollContainer: {
    flexGrow: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    elevation: 5,
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    fontStyle: "italic",
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
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
    marginRight: 10,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#1E5F74",
    marginLeft: 10,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});