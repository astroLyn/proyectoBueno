"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  FlatList,
  StatusBar,
  Image,
} from "react-native"
import {
  crearTarea,
  obtenerEstadisticasTareas,
  obtenerMiembrosProyecto,
  invitarUsuario,
  eliminarMiembro,
  verificarPermisos,
  obtenerTareasProyecto,
  finalizarProyecto,
} from "../proyectosService"
import { auth } from "../firebaseConfig"
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view"
import { Feather } from "@expo/vector-icons"

const PRIORIDADES = [
  { id: "alta", label: "Alta", color: "#FF6B6B" },
  { id: "media", label: "Media", color: "#FF9800" },
  { id: "baja", label: "Baja", color: "#4CAF50" },
]

export default function InfoProyectosScreen({ route, navigation }) {
  const { proyecto } = route.params
  const [activeTab, setActiveTab] = useState("resumen")
  const [modalVisible, setModalVisible] = useState(false)
  const [modalInvitarVisible, setModalInvitarVisible] = useState(false)
  const [emailInvitacion, setEmailInvitacion] = useState("")
  const [rolSeleccionado, setRolSeleccionado] = useState("Empleado")
  const [miembros, setMiembros] = useState([])
  const [tareas, setTareas] = useState([])
  const [busquedaMiembro, setBusquedaMiembro] = useState("")
  const [miembrosFiltrados, setMiembrosFiltrados] = useState([])
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: "",
    descripcion: "",
    asignadoA: "",
    asignadoANombre: "",
    asignadoProfileImage: "",
    fechaVencimiento: "",
    prioridad: "media",
    estado: "En Progreso",
    comentarios: [],
  })
  const [estadisticas, setEstadisticas] = useState({
    completadas: 0,
    total: 0,
    vencidas: 0,
    actualizadas: 0,
  })
  const [permisos, setPermisos] = useState({
    puedeInvitar: false,
    puedeEliminarMiembros: false,
    puedeCrearTareas: false,
    puedeFinalizarProyecto: false,
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (miembros.length > 0) {
      const filtrados = miembros.filter(
        (miembro) =>
          miembro.username.toLowerCase().includes(busquedaMiembro.toLowerCase()) ||
          miembro.email.toLowerCase().includes(busquedaMiembro.toLowerCase()),
      )
      setMiembrosFiltrados(filtrados)
    }
  }, [busquedaMiembro, miembros])

  const cargarDatos = async () => {
    try {
      await Promise.all([cargarEstadisticas(), cargarMiembros(), cargarTareas(), verificarPermisosUsuario()])
    } catch (error) {
      console.error("Error al cargar datos:", error)
      Alert.alert("Error", "No se pudieron cargar los datos del proyecto")
    }
  }

  const verificarPermisosUsuario = async () => {
    try {
      const [puedeInvitar, puedeEliminarMiembros, puedeCrearTareas, puedeFinalizarProyecto] = await Promise.all([
        verificarPermisos(proyecto.id, "invitar"),
        verificarPermisos(proyecto.id, "eliminar_miembro"),
        verificarPermisos(proyecto.id, "crear_tarea"),
        verificarPermisos(proyecto.id, "finalizar_proyecto"),
      ])

      setPermisos({
        puedeInvitar,
        puedeEliminarMiembros,
        puedeCrearTareas,
        puedeFinalizarProyecto,
      })
    } catch (error) {
      console.error("Error al verificar permisos:", error)
    }
  }

  const cargarEstadisticas = async () => {
    try {
      const stats = await obtenerEstadisticasTareas(proyecto.id)
      setEstadisticas(stats)
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
      throw error
    }
  }

  const cargarMiembros = async () => {
    try {
      const miembrosData = await obtenerMiembrosProyecto(proyecto.id)
      console.log("Miembros cargados:", JSON.stringify(miembrosData, null, 2))
      setMiembros(miembrosData)
    } catch (error) {
      console.error("Error al cargar miembros:", error)
      throw error
    }
  }

  const cargarTareas = async () => {
    try {
      const tareasData = await obtenerTareasProyecto(proyecto.id)
      setTareas(tareasData)
    } catch (error) {
      console.error("Error al cargar tareas:", error)
      throw error
    }
  }

  // Función para formatear la fecha de YYYY-MM-DD o ISO a DD-MM-YYYY
  const formatearFecha = (fecha) => {
    if (!fecha) return ""

    // Si es una fecha ISO completa (con T)
    if (fecha.includes("T")) {
      const date = new Date(fecha)
      const dia = date.getDate().toString().padStart(2, "0")
      const mes = (date.getMonth() + 1).toString().padStart(2, "0")
      const anio = date.getFullYear()
      return `${dia}-${mes}-${anio}`
    }

    // Si es formato YYYY-MM-DD
    const partes = fecha.split("-")
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1]}-${partes[0]}`
    }

    return fecha
  }

  // Función para manejar la entrada de fecha con formato automático
  const handleFechaInput = (text) => {
    // Eliminar cualquier carácter que no sea número
    const cleaned = text.replace(/[^0-9]/g, "")

    // Aplicar formato automático
    if (cleaned.length <= 2) {
      setNuevaTarea({ ...nuevaTarea, fechaVencimiento: cleaned })
    } else if (cleaned.length <= 4) {
      setNuevaTarea({
        ...nuevaTarea,
        fechaVencimiento: cleaned.substring(0, 2) + "-" + cleaned.substring(2),
      })
    } else {
      setNuevaTarea({
        ...nuevaTarea,
        fechaVencimiento: cleaned.substring(0, 2) + "-" + cleaned.substring(2, 4) + "-" + cleaned.substring(4, 8),
      })
    }
  }

  // Función para validar si una fecha es mayor a la fecha actual
  const esFechaMayorAHoy = (fechaStr) => {
    // Verificar formato DD-MM-YYYY
    if (!fechaStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return false
    }

    // Convertir de DD-MM-YYYY a objeto Date
    const partes = fechaStr.split("-")
    const fecha = new Date(
      Number.parseInt(partes[2]), // Año
      Number.parseInt(partes[1]) - 1, // Mes (0-11)
      Number.parseInt(partes[0]), // Día
    )

    // Obtener fecha actual sin horas/minutos/segundos
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    // Comparar
    return fecha > hoy
  }

  const handleCrearTarea = async () => {
    try {
      if (!nuevaTarea.titulo || !nuevaTarea.asignadoA || !nuevaTarea.fechaVencimiento || !nuevaTarea.prioridad) {
        Alert.alert("Error", "Completa todos los campos requeridos")
        return
      }

      // Validar que la fecha de vencimiento sea mayor a la fecha actual
      if (!esFechaMayorAHoy(nuevaTarea.fechaVencimiento)) {
        Alert.alert("Error", "La fecha de vencimiento debe ser posterior a la fecha actual")
        return
      }

      // Convertir la fecha de fin de DD-MM-YYYY a YYYY-MM-DD para almacenarla
      let fechaVencimientoFormateada = nuevaTarea.fechaVencimiento
      if (fechaVencimientoFormateada.includes("-")) {
        const partes = fechaVencimientoFormateada.split("-")
        if (partes.length === 3) {
          fechaVencimientoFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`
        }
      }

      await crearTarea({
        ...nuevaTarea,
        proyectoId: proyecto.id,
        fechaEstimadaFinalizacion: fechaVencimientoFormateada,
      })

      setModalVisible(false)
      setNuevaTarea({
        titulo: "",
        descripcion: "",
        asignadoA: "",
        asignadoANombre: "",
        asignadoProfileImage: "",
        fechaVencimiento: "",
        prioridad: "media",
        estado: "En Progreso",
        comentarios: [],
      })

      await cargarDatos()
      Alert.alert("Éxito", "Tarea creada correctamente")
    } catch (error) {
      console.error("Error al crear tarea:", error)
      Alert.alert("Error", error.message)
    }
  }

  const handleInvitarMiembro = async () => {
    try {
      if (!emailInvitacion) {
        Alert.alert("Error", "Por favor ingresa un correo electrónico")
        return
      }

      await invitarUsuario(proyecto.id, emailInvitacion, rolSeleccionado)
      setModalInvitarVisible(false)
      setEmailInvitacion("")
      setRolSeleccionado("Empleado")
      await cargarMiembros()
      Alert.alert("Éxito", "Invitación enviada correctamente")
    } catch (error) {
      console.error("Error al invitar miembro:", error)
      Alert.alert("Error", error.message)
    }
  }

  const handleEliminarMiembro = async (miembroId) => {
    try {
      await eliminarMiembro(proyecto.id, miembroId)
      await cargarMiembros()
      Alert.alert("Éxito", "Miembro eliminado correctamente")
    } catch (error) {
      console.error("Error al eliminar miembro:", error)
      Alert.alert("Error", error.message)
    }
  }

  const handleFinalizarProyecto = async () => {
    try {
      Alert.alert(
        "Finalizar Proyecto",
        "¿Estás seguro que deseas finalizar este proyecto? Esta acción no se puede deshacer.",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Finalizar",
            style: "destructive",
            onPress: async () => {
              try {
                await finalizarProyecto(proyecto.id)
                await cargarDatos()
                Alert.alert("Éxito", "El proyecto ha sido finalizado")
                navigation.goBack()
              } catch (error) {
                console.error("Error al finalizar proyecto:", error)
                Alert.alert("Error", error.message)
              }
            },
          },
        ],
      )
    } catch (error) {
      console.error("Error al finalizar proyecto:", error)
      Alert.alert("Error", error.message)
    }
  }

  const seleccionarMiembro = (miembro) => {
    setNuevaTarea({
      ...nuevaTarea,
      asignadoA: miembro.userId,
      asignadoANombre: miembro.username,
      asignadoProfileImage: miembro.profileImage,
    })
    setBusquedaMiembro("")
  }

  // Agrupar miembros por rol
  const miembrosAgrupados = () => {
    const gerentes = miembros.filter((m) => m.rol === "Gerente")
    const supervisores = miembros.filter((m) => m.rol === "Supervisor")
    const empleados = miembros.filter((m) => m.rol === "Empleado")

    return [...gerentes, ...supervisores, ...empleados]
  }

  const ResumenContent = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{estadisticas.completadas}</Text>
          <Text style={styles.statsLabel}>Tareas Completadas</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{estadisticas.total}</Text>
          <Text style={styles.statsLabel}>Tareas Totales</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{estadisticas.vencidas}</Text>
          <Text style={styles.statsLabel}>Tareas Vencidas</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{estadisticas.actualizadas}</Text>
          <Text style={styles.statsLabel}>En Progreso</Text>
        </View>
      </View>

      {permisos.puedeCrearTareas && (
        <TouchableOpacity style={styles.addTaskButton} onPress={() => setModalVisible(true)}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addTaskButtonText}>Nueva Tarea</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.viewTasksButton}
        onPress={() =>
          navigation.navigate("ListaTareas", {
            proyecto,
            userRole: miembros.find((m) => m.userId === auth.currentUser?.uid)?.rol,
          })
        }
      >
        <Feather name="list" size={18} color="#fff" />
        <Text style={styles.viewTasksButtonText}>Ver Tareas</Text>
      </TouchableOpacity>
    </View>
  )

  const InformacionContent = () => (
    <View style={styles.content}>
      <View style={styles.infoCard}>
        <View style={styles.detailRow}>
          <Feather name="user" size={18} color="#1E5F74" />
          <Text style={styles.detailLabel}>Cliente:</Text>
          <Text style={styles.detailText}>{proyecto.cliente}</Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="map-pin" size={18} color="#1E5F74" />
          <Text style={styles.detailLabel}>Ubicación:</Text>
          <Text style={styles.detailText}>{proyecto.ubicacion}</Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="calendar" size={18} color="#1E5F74" />
          <Text style={styles.detailLabel}>Fecha de inicio:</Text>
          <Text style={styles.detailText}>{formatearFecha(proyecto.fechaInicio)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="calendar" size={18} color="#1E5F74" />
          <Text style={styles.detailLabel}>Fecha de fin:</Text>
          <Text style={styles.detailText}>{formatearFecha(proyecto.fechaFin)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Feather name="flag" size={18} color="#1E5F74" />
          <Text style={styles.detailLabel}>Estado:</Text>
          <View
            style={[styles.statusBadge, { backgroundColor: proyecto.estado === "Finalizado" ? "#4CAF50" : "#FF9800" }]}
          >
            <Text style={styles.statusText}>{proyecto.estado}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Feather name="briefcase" size={18} color="#1E5F74" />
          <Text style={styles.detailLabel}>Gerente:</Text>
          <Text style={styles.detailText}>{proyecto.gerenteUsername}</Text>
        </View>
      </View>

      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionLabel}>
          <Feather name="file-text" size={18} color="#1E5F74" /> Descripción:
        </Text>
        <Text style={styles.descriptionText}>{proyecto.descripcion}</Text>
      </View>

      {permisos.puedeFinalizarProyecto && proyecto.estado !== "Finalizado" && (
        <TouchableOpacity style={styles.finalizarButton} onPress={handleFinalizarProyecto}>
          <Feather name="check-circle" size={18} color="#fff" />
          <Text style={styles.finalizarButtonText}>Finalizar Proyecto</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  const PersonalContent = () => {
    const miembrosOrdenados = miembrosAgrupados()
    const roles = ["Gerente", "Supervisor", "Empleado"]

    return (
      <View style={styles.content}>
        <View style={styles.personalHeader}>
          <Text style={styles.personalTitle}>Miembros del Proyecto</Text>
          {permisos.puedeInvitar && (
            <TouchableOpacity style={styles.inviteButton} onPress={() => setModalInvitarVisible(true)}>
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={styles.inviteButtonText}>Invitar</Text>
            </TouchableOpacity>
          )}
        </View>

        {roles.map((rol) => {
          const miembrosDelRol = miembrosOrdenados.filter((m) => m.rol === rol)
          if (miembrosDelRol.length === 0) return null

          return (
            <View key={rol} style={styles.rolSection}>
              <Text style={styles.rolTitle}>{rol}s</Text>

              {miembrosDelRol.map((miembro) => (
                <View key={miembro.id} style={styles.miembroCard}>
                  <View style={styles.miembroInfo}>
                    <View style={styles.miembroAvatar}>
                      {miembro.profileImage ? (
                        <Image
                          source={{ uri: miembro.profileImage }}
                          style={styles.miembroProfileImage}
                          resizeMode="cover"
                          onError={(e) =>
                            console.log("Error cargando imagen:", e.nativeEvent.error, miembro.profileImage)
                          }
                        />
                      ) : (
                        <Text style={styles.miembroAvatarText}>{miembro.username.charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={styles.miembroDetails}>
                      <Text style={styles.miembroNombre}>{miembro.username}</Text>
                      <Text style={styles.miembroEmail}>{miembro.email}</Text>
                    </View>
                  </View>

                  {permisos.puedeEliminarMiembros && miembro.userId !== auth.currentUser?.uid && (
                    <TouchableOpacity style={styles.eliminarButton} onPress={() => handleEliminarMiembro(miembro.id)}>
                      <Feather name="trash-2" size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E5F74" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{proyecto.nombre}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "resumen" && styles.activeTab]}
          onPress={() => setActiveTab("resumen")}
        >
          <Text style={[styles.tabText, activeTab === "resumen" && styles.activeTabText]}>Resumen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "informacion" && styles.activeTab]}
          onPress={() => setActiveTab("informacion")}
        >
          <Text style={[styles.tabText, activeTab === "informacion" && styles.activeTabText]}>Información</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "personal" && styles.activeTab]}
          onPress={() => setActiveTab("personal")}
        >
          <Text style={[styles.tabText, activeTab === "personal" && styles.activeTabText]}>Personal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {activeTab === "resumen" && <ResumenContent />}
        {activeTab === "informacion" && <InformacionContent />}
        {activeTab === "personal" && <PersonalContent />}
      </ScrollView>

      {/* Modal para crear nueva tarea */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <KeyboardAwareScrollView
            contentContainerStyle={styles.modalContent}
            enableOnAndroid={true}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Tarea</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Título de la tarea</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Instalación de ventanas"
                placeholderTextColor="#999"
                value={nuevaTarea.titulo}
                onChangeText={(text) => setNuevaTarea({ ...nuevaTarea, titulo: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe los detalles de la tarea..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={nuevaTarea.descripcion}
                onChangeText={(text) => setNuevaTarea({ ...nuevaTarea, descripcion: text })}
              />
            </View>

            {/* Asignar Miembro */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Asignar a:</Text>
              {nuevaTarea.asignadoANombre ? (
                <View style={styles.selectedMemberContainer}>
                  <View style={styles.selectedMemberAvatar}>
                    {nuevaTarea.asignadoProfileImage ? (
                      <Image
                        source={{ uri: nuevaTarea.asignadoProfileImage }}
                        style={styles.selectedMemberProfileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.selectedMemberAvatarText}>
                        {nuevaTarea.asignadoANombre.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.selectedMemberText}>{nuevaTarea.asignadoANombre}</Text>
                  <TouchableOpacity
                    style={styles.removeMemberButton}
                    onPress={() =>
                      setNuevaTarea({
                        ...nuevaTarea,
                        asignadoA: "",
                        asignadoANombre: "",
                        asignadoProfileImage: "",
                      })
                    }
                  >
                    <Feather name="x" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Buscar miembro..."
                    placeholderTextColor="#999"
                    value={busquedaMiembro}
                    onChangeText={setBusquedaMiembro}
                  />
                  {busquedaMiembro.length > 0 && (
                    <FlatList
                      data={miembrosFiltrados}
                      keyExtractor={(item) => item.id}
                      style={styles.searchResults}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={styles.searchResultItem} onPress={() => seleccionarMiembro(item)}>
                          <View style={styles.searchResultAvatar}>
                            {item.profileImage ? (
                              <Image
                                source={{ uri: item.profileImage }}
                                style={styles.searchResultProfileImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text style={styles.searchResultAvatarText}>{item.username.charAt(0).toUpperCase()}</Text>
                            )}
                          </View>
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultText}>{item.username}</Text>
                            <Text style={styles.searchResultSubtext}>{item.rol}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </>
              )}
            </View>

            {/* Prioridad */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Prioridad:</Text>
              <View style={styles.prioridadContainer}>
                {PRIORIDADES.map((prioridad) => (
                  <TouchableOpacity
                    key={prioridad.id}
                    style={[
                      styles.prioridadOption,
                      {
                        backgroundColor: nuevaTarea.prioridad === prioridad.id ? prioridad.color : "#F9F9F9",
                        borderColor: prioridad.color,
                      },
                    ]}
                    onPress={() => setNuevaTarea({ ...nuevaTarea, prioridad: prioridad.id })}
                  >
                    <Text
                      style={[
                        styles.prioridadText,
                        {
                          color: nuevaTarea.prioridad === prioridad.id ? "#fff" : prioridad.color,
                        },
                      ]}
                    >
                      {prioridad.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fecha */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha de vencimiento (DD-MM-YYYY):</Text>
              <TextInput
                style={styles.input}
                placeholder="DD-MM-YYYY"
                placeholderTextColor="#999"
                value={nuevaTarea.fechaVencimiento}
                onChangeText={handleFechaInput}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false)
                  setNuevaTarea({
                    titulo: "",
                    descripcion: "",
                    asignadoA: "",
                    asignadoANombre: "",
                    asignadoProfileImage: "",
                    fechaVencimiento: "",
                    prioridad: "media",
                    estado: "En Progreso",
                    comentarios: [],
                  })
                  setBusquedaMiembro("")
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleCrearTarea}>
                <Text style={styles.saveButtonText}>Guardar Tarea</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* Modal para invitar miembro */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalInvitarVisible}
        onRequestClose={() => setModalInvitarVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invitar Miembro</Text>
              <TouchableOpacity onPress={() => setModalInvitarVisible(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#999"
                value={emailInvitacion}
                onChangeText={setEmailInvitacion}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rol:</Text>
              <View style={styles.rolSelector}>
                {(permisos.puedeInvitar && !permisos.puedeEliminarMiembros
                  ? ["Empleado"] // Si es Supervisor, solo puede invitar Empleados
                  : ["Empleado", "Supervisor", "Gerente"]
                ) // Si es Gerente, puede invitar todos los roles
                  .map((rol) => (
                    <TouchableOpacity
                      key={rol}
                      style={[styles.rolOption, rolSeleccionado === rol && styles.rolOptionSelected]}
                      onPress={() => setRolSeleccionado(rol)}
                    >
                      <Text style={[styles.rolOptionText, rolSeleccionado === rol && styles.rolOptionTextSelected]}>
                        {rol}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalInvitarVisible(false)
                  setRolSeleccionado("Empleado")
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleInvitarMiembro}>
                <Text style={styles.saveButtonText}>Invitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 10,
    elevation: 2,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#1E5F74",
  },
  tabText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    alignItems: "center",
    elevation: 2,
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E5F74",
    marginBottom: 8,
  },
  statsLabel: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailLabel: {
    color: "#666",
    width: 120,
    fontSize: 15,
    fontWeight: "500",
    marginLeft: 10,
  },
  detailText: {
    color: "#333",
    flex: 1,
    fontSize: 15,
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
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  descriptionLabel: {
    color: "#666",
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 10,
  },
  descriptionText: {
    color: "#333",
    fontSize: 15,
    lineHeight: 22,
  },
  addTaskButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 4,
  },
  addTaskButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  viewTasksButton: {
    backgroundColor: "#1E5F74",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 4,
  },
  viewTasksButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    paddingTop: 80,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    width: 400,
    maxWidth: 700,
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
  personalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  personalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  inviteButton: {
    backgroundColor: "#1E5F74",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  rolSection: {
    marginBottom: 20,
  },
  rolTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 10,
    paddingLeft: 8,
  },
  miembroCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },
  miembroInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  miembroAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E5F74",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  miembroAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  miembroDetails: {
    flex: 1,
  },
  miembroNombre: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    marginBottom: 4,
  },
  miembroEmail: {
    fontSize: 14,
    color: "#666",
  },
  eliminarButton: {
    backgroundColor: "#FF6B6B",
    padding: 8,
    borderRadius: 8,
  },
  finalizarButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 4,
  },
  finalizarButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  rolSelector: {
    marginTop: 8,
  },
  rolOption: {
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  rolOptionSelected: {
    backgroundColor: "#1E5F74",
  },
  rolOptionText: {
    color: "#333",
    fontSize: 16,
  },
  rolOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  searchResults: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 150,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
  },
  searchResultAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E5F74",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  searchResultAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "500",
  },
  searchResultSubtext: {
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },
  selectedMemberContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedMemberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E5F74",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  selectedMemberAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  selectedMemberText: {
    color: "#333",
    fontSize: 15,
    flex: 1,
  },
  removeMemberButton: {
    padding: 5,
  },
  prioridadContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  prioridadOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
  },
  prioridadText: {
    fontSize: 14,
    fontWeight: "500",
  },
  miembroProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchResultProfileImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  selectedMemberProfileImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  miembroProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
})

