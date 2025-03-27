"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Image,
  StatusBar,
} from "react-native"
import {
  obtenerTareasProyecto,
  obtenerMiembrosProyecto,
  actualizarTarea,
  enviarNotificacion,
  subirImagenEvidencia,
} from "../proyectosService"
import { auth } from "../firebaseConfig"
import { Feather } from "@expo/vector-icons"
import { KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from "react-native"
import * as ImagePicker from "expo-image-picker"

const PRIORIDADES = {
  alta: { color: "#FF6B6B", label: "Alta" },
  media: { color: "#FF9800", label: "Media" },
  baja: { color: "#4CAF50", label: "Baja" },
}

export default function ListaTareasScreen({ route, navigation }) {
  const { proyecto, userRole } = route.params
  const [tareas, setTareas] = useState([])
  const [miembros, setMiembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [seccionActiva, setSeccionActiva] = useState("pendientes")
  const [filtros, setFiltros] = useState({
    prioridad: null,
    usuario: null,
  })
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [busquedaUsuario, setBusquedaUsuario] = useState("")
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null)
  const [mostrarDetalles, setMostrarDetalles] = useState(false)
  const [mostrarFinalizarModal, setMostrarFinalizarModal] = useState(false)
  const [comentarioFinalizacion, setComentarioFinalizacion] = useState("")
  const [finalizandoTarea, setFinalizandoTarea] = useState(false)

  // Estados para cambiar fecha de vencimiento
  const [mostrarCambiarFechaModal, setMostrarCambiarFechaModal] = useState(false)
  const [nuevaFechaVencimiento, setNuevaFechaVencimiento] = useState(new Date())
  const [fechaInputText, setFechaInputText] = useState("")
  const [razonCambioFecha, setRazonCambioFecha] = useState("")
  const [actualizandoFecha, setActualizandoFecha] = useState(false)
  const [fechaError, setFechaError] = useState("")

  // Estados para la imagen de evidencia
  const [imagenEvidencia, setImagenEvidencia] = useState(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  // Estado para controlar la visualización de la imagen ampliada
  const [mostrarImagenAmpliada, setMostrarImagenAmpliada] = useState(false)

  const miembrosFiltrados = miembros.filter((miembro) =>
    miembro.username.toLowerCase().includes(busquedaUsuario.toLowerCase()),
  )

  useEffect(() => {
    cargarDatos()
    solicitarPermisosCamara()
  }, [])

  // Solicitar permisos de cámara y galería
  const solicitarPermisosCamara = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (cameraStatus !== "granted" || mediaLibraryStatus !== "granted") {
      Alert.alert("Permisos necesarios", "Se necesitan permisos de cámara y galería para subir evidencias de tareas.", [
        { text: "OK" },
      ])
    }
  }

  // Efecto para inicializar la fecha cuando se selecciona una tarea
  useEffect(() => {
    if (tareaSeleccionada && tareaSeleccionada.fechaVencimiento) {
      try {
        // Parse the date correctly based on its format
        let fechaObj

        if (typeof tareaSeleccionada.fechaVencimiento === "string") {
          // If it's in YYYY-MM-DD format
          if (tareaSeleccionada.fechaVencimiento.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = tareaSeleccionada.fechaVencimiento.split("-").map(Number)
            fechaObj = new Date(year, month - 1, day)
          }
          // If it's in ISO format
          else if (tareaSeleccionada.fechaVencimiento.includes("T")) {
            fechaObj = new Date(tareaSeleccionada.fechaVencimiento)
          }
          // If it's in DD-MM-YYYY format
          else if (tareaSeleccionada.fechaVencimiento.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const [day, month, year] = tareaSeleccionada.fechaVencimiento.split("-").map(Number)
            fechaObj = new Date(year, month - 1, day)
          } else {
            // Try generic parsing as fallback
            fechaObj = new Date(tareaSeleccionada.fechaVencimiento)
          }
        } else if (tareaSeleccionada.fechaVencimiento instanceof Date) {
          fechaObj = tareaSeleccionada.fechaVencimiento
        }

        // Validate the date is valid
        if (fechaObj && !isNaN(fechaObj.getTime())) {
          setNuevaFechaVencimiento(fechaObj)

          // Format the date for the input (DD-MM-YYYY)
          const dia = fechaObj.getDate().toString().padStart(2, "0")
          const mes = (fechaObj.getMonth() + 1).toString().padStart(2, "0")
          const anio = fechaObj.getFullYear().toString()
          setFechaInputText(`${dia}-${mes}-${anio}`)

          console.log("Fecha inicializada:", `${dia}-${mes}-${anio}`)
        } else {
          console.error("Invalid date object:", tareaSeleccionada.fechaVencimiento)
          // Set a default date (today + 7 days) if the date is invalid
          const defaultDate = new Date()
          defaultDate.setDate(defaultDate.getDate() + 7)
          setNuevaFechaVencimiento(defaultDate)

          const dia = defaultDate.getDate().toString().padStart(2, "0")
          const mes = (defaultDate.getMonth() + 1).toString().padStart(2, "0")
          const anio = defaultDate.getFullYear().toString()
          setFechaInputText(`${dia}-${mes}-${anio}`)
        }
      } catch (error) {
        console.error("Error initializing date:", error)
        // Set a default date (today + 7 days) if there's an error
        const defaultDate = new Date()
        defaultDate.setDate(defaultDate.getDate() + 7)
        setNuevaFechaVencimiento(defaultDate)

        const dia = defaultDate.getDate().toString().padStart(2, "0")
        const mes = (defaultDate.getMonth() + 1).toString().padStart(2, "0")
        const anio = defaultDate.getFullYear().toString()
        setFechaInputText(`${dia}-${mes}-${anio}`)
      }
    }
  }, [tareaSeleccionada])

  useEffect(() => {
    // Si se navega desde una notificación y se proporciona un tareaId, abrir automáticamente esa tarea
    if (route.params?.abrirTarea && route.params?.tareaId) {
      const tareaId = route.params.tareaId
      const tareaEncontrada = tareas.find((t) => t.id === tareaId)

      if (tareaEncontrada) {
        setTareaSeleccionada(tareaEncontrada)
        setMostrarDetalles(true)
      }
    }
  }, [tareas, route.params])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [tareasData, miembrosData] = await Promise.all([
        obtenerTareasProyecto(proyecto.id),
        obtenerMiembrosProyecto(proyecto.id),
      ])

      let tareasFiltradas = tareasData
      if (userRole === "Empleado") {
        tareasFiltradas = tareasData.filter((tarea) => tarea.asignadoA === auth.currentUser?.uid)
      } else if (userRole === "Supervisor") {
        const empleadosIds = miembrosData.filter((m) => m.rol === "Empleado").map((m) => m.userId)
        tareasFiltradas = tareasData.filter(
          (tarea) => tarea.asignadoA === auth.currentUser?.uid || empleadosIds.includes(tarea.asignadoA),
        )
      }

      setTareas(tareasFiltradas)
      setMiembros(miembrosData)
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setLoading(false)
    }
  }

  // Función para formatear la fecha de YYYY-MM-DD a DD-MM-YYYY
  const formatearFecha = (fecha) => {
    if (!fecha) return ""

    try {
      // If it's a Date object
      if (fecha instanceof Date && !isNaN(fecha)) {
        const dia = fecha.getDate().toString().padStart(2, "0")
        const mes = (fecha.getMonth() + 1).toString().padStart(2, "0")
        const anio = fecha.getFullYear()
        return `${dia}-${mes}-${anio}`
      }

      // If it's an ISO date string (with T)
      if (typeof fecha === "string" && fecha.includes("T")) {
        const date = new Date(fecha)
        if (isNaN(date.getTime())) throw new Error("Invalid date")

        const dia = date.getDate().toString().padStart(2, "0")
        const mes = (date.getMonth() + 1).toString().padStart(2, "0")
        const anio = date.getFullYear()
        return `${dia}-${mes}-${anio}`
      }

      // If it's a YYYY-MM-DD format
      if (typeof fecha === "string" && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = fecha.split("-")
        return `${day}-${month}-${year}`
      }

      // If it's already in DD-MM-YYYY format or any other format, return as is
      return fecha
    } catch (error) {
      console.error("Error formatting date:", error, fecha)
      return ""
    }
  }

  const getTareasPorEstado = () => {
    const hoy = new Date()
    // Establecer la hora a 00:00:00 para comparar solo fechas
    hoy.setHours(0, 0, 0, 0)

    let tareasFiltradas = tareas

    if (filtros.prioridad) {
      tareasFiltradas = tareasFiltradas.filter((tarea) => tarea.prioridad === filtros.prioridad)
    }
    if (filtros.usuario) {
      tareasFiltradas = tareasFiltradas.filter((tarea) => tarea.asignadoA === filtros.usuario)
    }

    // Helper function to parse dates consistently
    const parsearFecha = (fechaStr) => {
      if (!fechaStr) return null

      try {
        // If it's already a Date object
        if (fechaStr instanceof Date) {
          return isNaN(fechaStr) ? null : fechaStr
        }

        let fecha

        // If it's an ISO date string (with T)
        if (typeof fechaStr === "string" && fechaStr.includes("T")) {
          fecha = new Date(fechaStr)
        }
        // If it's a YYYY-MM-DD format
        else if (typeof fechaStr === "string" && fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = fechaStr.split("-").map(Number)
          fecha = new Date(year, month - 1, day)
        }
        // If it's a DD-MM-YYYY format
        else if (typeof fechaStr === "string" && fechaStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const [day, month, year] = fechaStr.split("-").map(Number)
          fecha = new Date(year, month - 1, day)
        }
        // Try as a generic date string
        else {
          fecha = new Date(fechaStr)
        }

        return isNaN(fecha.getTime()) ? null : fecha
      } catch (error) {
        console.error("Error parsing date:", error, fechaStr)
        return null
      }
    }

    return {
      pendientes: tareasFiltradas.filter((tarea) => {
        if (tarea.estado === "Completada") return false

        const fechaVencimiento = parsearFecha(tarea.fechaVencimiento)
        if (!fechaVencimiento) return false

        return (tarea.estado === "Pendiente" || tarea.estado === "En Progreso") && fechaVencimiento >= hoy
      }),

      completadas: tareasFiltradas.filter((tarea) => tarea.estado === "Completada"),

      vencidas: tareasFiltradas.filter((tarea) => {
        if (tarea.estado === "Completada") return false

        const fechaVencimiento = parsearFecha(tarea.fechaVencimiento)
        if (!fechaVencimiento) return false

        return fechaVencimiento < hoy
      }),
    }
  }

  // Función para manejar la entrada de fecha con formato automático
  const handleFechaChange = (text) => {
    // Eliminar cualquier carácter que no sea número
    const cleaned = text.replace(/[^0-9]/g, "")

    // Aplicar formato automático
    if (cleaned.length <= 2) {
      setFechaInputText(cleaned)
    } else if (cleaned.length <= 4) {
      setFechaInputText(cleaned.substring(0, 2) + "-" + cleaned.substring(2))
    } else {
      setFechaInputText(cleaned.substring(0, 2) + "-" + cleaned.substring(2, 4) + "-" + cleaned.substring(4, 8))
    }

    setFechaError("")
  }

  // Función para validar si una fecha es mayor a la fecha actual
  const esFechaMayorAHoy = (fechaStr) => {
    // Verificar formato DD-MM-YYYY
    if (!fechaStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return false
    }

    try {
      // Convert from DD-MM-YYYY to Date object
      const [dia, mes, anio] = fechaStr.split("-").map(Number)
      const fecha = new Date(anio, mes - 1, dia)

      // Set time to beginning of day for accurate comparison
      fecha.setHours(0, 0, 0, 0)

      // Get current date without hours/minutes/seconds
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      // Compare - allow date to be equal to today
      return fecha >= hoy
    } catch (error) {
      console.error("Error validating date:", error)
      return false
    }
  }

  // Función para validar y convertir la fecha ingresada
  const validarYConvertirFecha = () => {
    // Verificar el formato correcto (DD-MM-YYYY)
    const formatoRegex = /^(\d{2})-(\d{2})-(\d{4})$/
    if (!formatoRegex.test(fechaInputText)) {
      setFechaError("Formato inválido. Usa DD-MM-YYYY")
      return null
    }

    const [, dia, mes, anio] = fechaInputText.match(formatoRegex)

    // Convertir a números
    const diaNum = Number.parseInt(dia, 10)
    const mesNum = Number.parseInt(mes, 10) - 1 // Los meses en JS van de 0 a 11
    const anioNum = Number.parseInt(anio, 10)

    // Validar rango de valores
    if (diaNum < 1 || diaNum > 31) {
      setFechaError("Día inválido")
      return null
    }

    if (mesNum < 0 || mesNum > 11) {
      setFechaError("Mes inválido")
      return null
    }

    if (anioNum < 2000 || anioNum > 2100) {
      setFechaError("Año inválido")
      return null
    }

    // Crear objeto Date
    const fecha = new Date(anioNum, mesNum, diaNum)

    // Verificar que la fecha sea válida (por ejemplo, 31 de febrero no existe)
    if (fecha.getDate() !== diaNum || fecha.getMonth() !== mesNum || fecha.getFullYear() !== anioNum) {
      setFechaError("Fecha inválida")
      return null
    }

    // Verificar que la fecha no sea anterior a hoy
    if (!esFechaMayorAHoy(fechaInputText)) {
      setFechaError("La fecha no puede ser anterior a hoy")
      return null
    }

    return fecha
  }

  // Función para seleccionar imagen de la galería
  const seleccionarImagen = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImagenEvidencia(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error)
      Alert.alert("Error", "No se pudo seleccionar la imagen. Intenta nuevamente.")
    }
  }

  // Función para tomar foto con la cámara
  const tomarFoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImagenEvidencia(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error al tomar foto:", error)
      Alert.alert("Error", "No se pudo tomar la foto. Intenta nuevamente.")
    }
  }

  const finalizarTarea = async () => {
    if (!comentarioFinalizacion.trim()) {
      Alert.alert("Error", "Debes agregar un comentario para finalizar la tarea")
      return
    }

    if (!imagenEvidencia) {
      Alert.alert("Error", "Debes subir una imagen como evidencia para finalizar la tarea")
      return
    }

    try {
      setFinalizandoTarea(true)

      // Subir imagen a Cloudinary
      setSubiendoImagen(true)
      const imagenUrl = await subirImagenEvidencia(proyecto.id, tareaSeleccionada.id, imagenEvidencia)
      setSubiendoImagen(false)

      const tareaActualizada = {
        ...tareaSeleccionada,
        estado: "Completada",
        comentarioFinalizacion: comentarioFinalizacion,
        fechaFinalizacion: new Date().toISOString(),
        evidenciaImagen: imagenUrl,
      }

      await actualizarTarea(proyecto.id, tareaActualizada)

      setTareas(tareas.map((t) => (t.id === tareaSeleccionada.id ? tareaActualizada : t)))

      setMostrarFinalizarModal(false)
      setMostrarDetalles(false)
      setComentarioFinalizacion("")
      setImagenEvidencia(null)

      Alert.alert("Éxito", "Tarea finalizada correctamente")
    } catch (error) {
      console.error("Error al finalizar tarea:", error)
      Alert.alert("Error", "No se pudo finalizar la tarea. Intenta nuevamente.")
    } finally {
      setFinalizandoTarea(false)
    }
  }

  // Función para cambiar la fecha de vencimiento
  const cambiarFechaVencimiento = async () => {
    if (!razonCambioFecha.trim()) {
      Alert.alert("Error", "Debes agregar una razón válida para el cambio de fecha")
      return
    }

    // Validar la fecha ingresada
    const fechaValida = validarYConvertirFecha()
    if (!fechaValida) {
      return // El error ya se muestra en la UI
    }

    try {
      setActualizandoFecha(true)

      // Get the previous date for history
      let fechaAnterior = null
      if (tareaSeleccionada.fechaVencimiento) {
        try {
          if (typeof tareaSeleccionada.fechaVencimiento === "string") {
            // If it's in YYYY-MM-DD format
            if (tareaSeleccionada.fechaVencimiento.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = tareaSeleccionada.fechaVencimiento.split("-").map(Number)
              fechaAnterior = new Date(year, month - 1, day)
            }
            // If it's in ISO format
            else if (tareaSeleccionada.fechaVencimiento.includes("T")) {
              fechaAnterior = new Date(tareaSeleccionada.fechaVencimiento)
            }
            // If it's in DD-MM-YYYY format
            else if (tareaSeleccionada.fechaVencimiento.match(/^\d{2}-\d{2}-\d{4}$/)) {
              const [day, month, year] = tareaSeleccionada.fechaVencimiento.split("-").map(Number)
              fechaAnterior = new Date(year, month - 1, day)
            } else {
              // Try generic parsing as fallback
              fechaAnterior = new Date(tareaSeleccionada.fechaVencimiento)
            }
          } else if (tareaSeleccionada.fechaVencimiento instanceof Date) {
            fechaAnterior = tareaSeleccionada.fechaVencimiento
          }

          if (isNaN(fechaAnterior.getTime())) {
            fechaAnterior = null
          }
        } catch (error) {
          console.error("Error parsing previous date:", error)
          fechaAnterior = null
        }
      }

      // Convert the validated date to YYYY-MM-DD format for storage
      const anio = fechaValida.getFullYear()
      const mes = (fechaValida.getMonth() + 1).toString().padStart(2, "0")
      const dia = fechaValida.getDate().toString().padStart(2, "0")
      const fechaFormateada = `${anio}-${mes}-${dia}`

      console.log("Guardando fecha:", fechaFormateada)

      const tareaActualizada = {
        ...tareaSeleccionada,
        fechaVencimiento: fechaFormateada, // Store in YYYY-MM-DD format
        cambiosFecha: [
          ...(tareaSeleccionada.cambiosFecha || []),
          {
            fechaAnterior: fechaAnterior ? fechaAnterior.toISOString() : "Fecha desconocida",
            fechaNueva: fechaValida.toISOString(),
            razon: razonCambioFecha,
            cambiadoPor: auth.currentUser.uid,
            fechaCambio: new Date().toISOString(),
          },
        ],
      }

      await actualizarTarea(proyecto.id, tareaActualizada)

      // Enviar notificación al usuario asignado
      if (tareaSeleccionada.asignadoA !== auth.currentUser.uid) {
        const miembroAsignado = miembros.find((m) => m.userId === tareaSeleccionada.asignadoA)
        if (miembroAsignado) {
          await enviarNotificacion({
            tipo: "cambio_fecha",
            usuarioId: tareaSeleccionada.asignadoA,
            titulo: `Cambio de fecha en tarea: ${tareaSeleccionada.titulo}`,
            mensaje: `La fecha de vencimiento ha sido cambiada del ${
              fechaAnterior ? formatearFecha(fechaAnterior.toISOString()) : "Fecha desconocida"
            } al ${formatearFecha(fechaValida.toISOString())}. Razón: ${razonCambioFecha}`,
            datos: {
              proyectoId: proyecto.id,
              tareaId: tareaSeleccionada.id,
              fechaAnterior: fechaAnterior ? fechaAnterior.toISOString() : "Fecha desconocida",
              fechaNueva: fechaValida.toISOString(),
            },
            leido: false,
            fechaCreacion: new Date().toISOString(),
          })
        }
      }

      // Update the local state with the updated task
      setTareas((prevTareas) => prevTareas.map((t) => (t.id === tareaSeleccionada.id ? tareaActualizada : t)))

      // Also update the selected task to reflect the changes immediately
      setTareaSeleccionada(tareaActualizada)

      setMostrarCambiarFechaModal(false)
      setRazonCambioFecha("")
      setFechaInputText("")

      Alert.alert("Éxito", "Fecha de vencimiento actualizada correctamente")
    } catch (error) {
      console.error("Error al cambiar fecha de vencimiento:", error)
      Alert.alert("Error", "No se pudo actualizar la fecha. Intenta nuevamente.")
    } finally {
      setActualizandoFecha(false)
    }
  }

  const renderFiltros = () => (
    <Modal
      visible={mostrarFiltros}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setMostrarFiltros(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setMostrarFiltros(false)}>
              <Feather name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Filtro por Prioridad */}
          <View style={styles.filtroSeccion}>
            <View style={styles.filtroTituloContainer}>
              <Feather name="flag" size={20} color="#1E5F74" />
              <Text style={styles.filtroTitulo}>Prioridad</Text>
            </View>
            <View style={styles.filtroOpciones}>
              {Object.entries(PRIORIDADES).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filtroOpcion,
                    filtros.prioridad === key && {
                      backgroundColor: value.color,
                      borderColor: value.color,
                    },
                  ]}
                  onPress={() =>
                    setFiltros((prev) => ({
                      ...prev,
                      prioridad: prev.prioridad === key ? null : key,
                    }))
                  }
                >
                  <Text style={[styles.filtroOpcionTexto, filtros.prioridad === key && { color: "#fff" }]}>
                    {value.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filtroSeccion}>
            <View style={styles.filtroTituloContainer}>
              <Feather name="users" size={20} color="#1E5F74" />
              <Text style={styles.filtroTitulo}>Filtrar por usuario</Text>
            </View>

            <View style={styles.searchContainer}>
              <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar usuario..."
                placeholderTextColor="#999"
                value={busquedaUsuario}
                onChangeText={setBusquedaUsuario}
              />
            </View>

            {filtros.usuario && (
              <View style={styles.usuarioSeleccionadoContainer}>
                <Text style={styles.usuarioSeleccionadoLabel}>Usuario seleccionado:</Text>
                <View style={styles.usuarioSeleccionado}>
                  <View style={styles.usuarioAvatar}>
                    <Text style={styles.usuarioAvatarText}>
                      {miembros
                        .find((m) => m.userId === filtros.usuario)
                        ?.username.charAt(0)
                        .toUpperCase() || "?"}
                    </Text>
                  </View>
                  <Text style={styles.usuarioNombre}>
                    {miembros.find((m) => m.userId === filtros.usuario)?.username || "Usuario"}
                  </Text>
                  <TouchableOpacity
                    style={styles.eliminarUsuarioBtn}
                    onPress={() => setFiltros((prev) => ({ ...prev, usuario: null }))}
                  >
                    <Feather name="x" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {busquedaUsuario.length > 0 && (
              <View style={styles.resultadosBusqueda}>
                {miembrosFiltrados.length > 0 ? (
                  miembrosFiltrados.map((miembro) => (
                    <TouchableOpacity
                      key={miembro.userId}
                      style={styles.resultadoBusqueda}
                      onPress={() => {
                        setFiltros((prev) => ({
                          ...prev,
                          usuario: miembro.userId,
                        }))
                        setBusquedaUsuario("")
                      }}
                    >
                      <View style={styles.resultadoAvatar}>
                        <Text style={styles.resultadoAvatarText}>{miembro.username.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.resultadoInfo}>
                        <Text style={styles.resultadoNombre}>{miembro.username}</Text>
                        <Text style={styles.resultadoRol}>{miembro.rol}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResultadosContainer}>
                    <Feather name="user-x" size={24} color="#BBBBBB" />
                    <Text style={styles.noResultados}>No se encontraron usuarios</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.filtrosActivos}>
            {(filtros.prioridad || filtros.usuario) && (
              <>
                <Text style={styles.filtrosActivosLabel}>Filtros activos:</Text>
                <View style={styles.filtrosActivosContainer}>
                  {filtros.prioridad && (
                    <View style={[styles.filtroActivoTag, { backgroundColor: PRIORIDADES[filtros.prioridad].color }]}>
                      <Text style={styles.filtroActivoText}>Prioridad: {PRIORIDADES[filtros.prioridad].label}</Text>
                    </View>
                  )}
                  {filtros.usuario && (
                    <View style={styles.filtroActivoTag}>
                      <Text style={styles.filtroActivoText}>
                        Usuario: {miembros.find((m) => m.userId === filtros.usuario)?.username || "Usuario"}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>

          <View style={styles.modalBotones}>
            <TouchableOpacity
              style={[styles.modalBoton, styles.modalBotonSecundario]}
              onPress={() => {
                setFiltros({ prioridad: null, usuario: null })
                setBusquedaUsuario("")
              }}
            >
              <Feather name="trash-2" size={18} color="#666" style={{ marginRight: 8 }} />
              <Text style={styles.modalBotonTextoSecundario}>Limpiar filtros</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBoton, styles.modalBotonPrimario]}
              onPress={() => setMostrarFiltros(false)}
            >
              <Feather name="check" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.modalBotonTextoPrimario}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderDetallesTarea = () => {
    if (!tareaSeleccionada) return null

    const miembroAsignado = miembros.find((m) => m.userId === tareaSeleccionada.asignadoA)
    const prioridad = PRIORIDADES[tareaSeleccionada.prioridad] || PRIORIDADES.media

    let fechaVencimiento
    try {
      if (typeof tareaSeleccionada.fechaVencimiento === "string") {
        // If it's in YYYY-MM-DD format
        if (tareaSeleccionada.fechaVencimiento.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = tareaSeleccionada.fechaVencimiento.split("-").map(Number)
          fechaVencimiento = new Date(year, month - 1, day)
        }
        // If it's in ISO format
        else if (tareaSeleccionada.fechaVencimiento.includes("T")) {
          fechaVencimiento = new Date(tareaSeleccionada.fechaVencimiento)
        }
        // If it's in DD-MM-YYYY format
        else if (tareaSeleccionada.fechaVencimiento.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const [day, month, year] = tareaSeleccionada.fechaVencimiento.split("-").map(Number)
          fechaVencimiento = new Date(year, month - 1, day)
        } else {
          // Try generic parsing as fallback
          fechaVencimiento = new Date(tareaSeleccionada.fechaVencimiento)
        }
      } else if (tareaSeleccionada.fechaVencimiento instanceof Date) {
        fechaVencimiento = tareaSeleccionada.fechaVencimiento
      } else {
        // Default to today if no valid date
        fechaVencimiento = new Date()
      }

      // Validate the date
      if (isNaN(fechaVencimiento.getTime())) {
        fechaVencimiento = new Date() // Default to today if invalid
      }
    } catch (error) {
      console.error("Error parsing date:", error)
      fechaVencimiento = new Date() // Default to today if error
    }
    const hoy = new Date()
    const diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24))

    return (
      <Modal
        visible={mostrarDetalles}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setMostrarDetalles(false)
          setMostrarImagenAmpliada(false)
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.detallesModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.detallesTitulo}>{tareaSeleccionada.titulo}</Text>
              <TouchableOpacity
                style={styles.cerrarBoton}
                onPress={() => {
                  setMostrarDetalles(false)
                  setMostrarImagenAmpliada(false)
                }}
              >
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detallesScroll}>
              <View style={[styles.prioridadBadge, { backgroundColor: prioridad.color, alignSelf: "flex-start" }]}>
                <Text style={styles.prioridadText}>{prioridad.label}</Text>
              </View>

              <Text style={styles.detallesSubtitulo}>Descripción</Text>
              <Text style={styles.detallesDescripcion}>{tareaSeleccionada.descripcion}</Text>

              <View style={styles.detallesInfoContainer}>
                <View style={styles.detallesInfoItem}>
                  <View style={styles.infoRow}>
                    <Feather name="user" size={18} color="#171321" />
                    <Text style={styles.detallesInfoLabel}>Asignado a</Text>
                  </View>
                  <Text style={styles.detallesInfoValor}>{miembroAsignado?.username || "Usuario no encontrado"}</Text>
                </View>

                <View style={styles.detallesInfoItem}>
                  <View style={styles.fechaContainer}>
                    <View style={styles.infoRow}>
                      <Feather name="calendar" size={18} color="#171321" />
                      <Text style={styles.detallesInfoLabel}>Fecha de vencimiento</Text>
                    </View>
                    {userRole === "Gerente" && tareaSeleccionada.estado !== "Completada" && (
                      <TouchableOpacity
                        style={styles.editarFechaBtn}
                        onPress={() => {
                          setMostrarDetalles(false)
                          setMostrarCambiarFechaModal(true)
                        }}
                      >
                        <Feather name="edit-2" size={16} color="#1E5F74" />
                        <Text style={styles.editarFechaText}>Cambiar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.detallesInfoValor}>{formatearFecha(tareaSeleccionada.fechaVencimiento)}</Text>
                </View>

                <View style={styles.detallesInfoItem}>
                  <View style={styles.infoRow}>
                    <Feather name="flag" size={18} color="#171321" />
                    <Text style={styles.detallesInfoLabel}>Estado</Text>
                  </View>
                  <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(tareaSeleccionada.estado) }]}>
                    <Text style={styles.estadoText}>{tareaSeleccionada.estado}</Text>
                  </View>
                </View>

                {tareaSeleccionada.estado !== "Completada" && (
                  <View style={styles.detallesInfoItem}>
                    <View style={styles.infoRow}>
                      <Feather name="clock" size={18} color="#171321" />
                      <Text style={styles.detallesInfoLabel}>Tiempo restante</Text>
                    </View>
                    <Text
                      style={[
                        styles.detallesInfoValor,
                        diasRestantes < 0 ? styles.textoVencido : diasRestantes <= 2 ? styles.textoProximoVencer : null,
                      ]}
                    >
                      {diasRestantes < 0
                        ? `Vencida hace ${Math.abs(diasRestantes)} días`
                        : diasRestantes === 0
                          ? "Vence hoy"
                          : `${diasRestantes} días restantes`}
                    </Text>
                  </View>
                )}

                {tareaSeleccionada.estado === "Completada" && (
                  <>
                    {tareaSeleccionada.comentarioFinalizacion && (
                      <View style={styles.detallesInfoItem}>
                        <View style={styles.infoRow}>
                          <Feather name="message-square" size={18} color="#171321" />
                          <Text style={styles.detallesInfoLabel}>Comentario de finalización</Text>
                        </View>
                        <Text style={styles.detallesInfoValor}>{tareaSeleccionada.comentarioFinalizacion}</Text>
                      </View>
                    )}

                    {tareaSeleccionada.evidenciaImagen && !mostrarImagenAmpliada && (
                      <View style={styles.detallesInfoItem}>
                        <View style={styles.infoRow}>
                          <Feather name="image" size={18} color="#171321" />
                          <Text style={styles.detallesInfoLabel}>Evidencia</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setMostrarImagenAmpliada(true)}
                          style={styles.evidenciaImagenContainer}
                        >
                          <Image
                            source={{ uri: tareaSeleccionada.evidenciaImagen }}
                            style={styles.evidenciaImagenThumbnail}
                            resizeMode="cover"
                          />
                          <Text style={styles.verImagenText}>Ver imagen</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {tareaSeleccionada.evidenciaImagen && mostrarImagenAmpliada && (
                      <View style={styles.imagenAmpliadaContainer}>
                        <TouchableOpacity
                          style={styles.cerrarImagenAmpliadaBtn}
                          onPress={() => setMostrarImagenAmpliada(false)}
                        >
                          <Feather name="x" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.9} onPress={() => setMostrarImagenAmpliada(false)}>
                          <Image
                            source={{ uri: tareaSeleccionada.evidenciaImagen }}
                            style={styles.imagenAmpliada}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                {/* Mostrar historial de cambios de fecha si existen */}
                {tareaSeleccionada.cambiosFecha && tareaSeleccionada.cambiosFecha.length > 0 && (
                  <View style={styles.detallesInfoItem}>
                    <Text style={styles.detallesSubtitulo}>Historial de cambios de fecha</Text>
                    {tareaSeleccionada.cambiosFecha.map((cambio, index) => {
                      const fechaAnterior = new Date(cambio.fechaAnterior)
                      const fechaNueva = new Date(cambio.fechaNueva)
                      const fechaCambio = new Date(cambio.fechaCambio)
                      const responsable = miembros.find((m) => m.userId === cambio.cambiadoPor)

                      return (
                        <View key={index} style={styles.cambiofechaItem}>
                          <Text style={styles.cambioFechaTexto}>
                            <Text style={styles.cambioFechaLabel}>Cambio: </Text>
                            {formatearFecha(fechaAnterior.toISOString())} → {formatearFecha(fechaNueva.toISOString())}
                          </Text>
                          <Text style={styles.cambioFechaTexto}>
                            <Text style={styles.cambioFechaLabel}>Razón: </Text>
                            {cambio.razon}
                          </Text>
                          <Text style={styles.cambioFechaTexto}>
                            <Text style={styles.cambioFechaLabel}>Realizado por: </Text>
                            {responsable?.username || "Usuario desconocido"}
                          </Text>
                          <Text style={styles.cambioFechaTexto}>
                            <Text style={styles.cambioFechaLabel}>Fecha del cambio: </Text>
                            {formatearFecha(fechaCambio.toISOString())}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                )}
              </View>
            </ScrollView>

            {tareaSeleccionada.estado !== "Completada" && (
              <TouchableOpacity
                style={styles.finalizarBoton}
                onPress={() => {
                  setMostrarDetalles(false)
                  setMostrarFinalizarModal(true)
                }}
              >
                <Feather name="check-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.finalizarBotonTexto}>Finalizar Tarea</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    )
  }

  const renderFinalizarModal = () => (
    <Modal
      visible={mostrarFinalizarModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setMostrarFinalizarModal(false)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.finalizarModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.finalizarModalTitulo}>Finalizar Tarea</Text>
              <TouchableOpacity onPress={() => setMostrarFinalizarModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.finalizarModalSubtitulo}>
              Agrega un comentario y una imagen como evidencia para finalizar la tarea
            </Text>

            <TextInput
              style={styles.comentarioInput}
              placeholder="Escribe un comentario..."
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={4}
              value={comentarioFinalizacion}
              onChangeText={setComentarioFinalizacion}
            />

            <View style={styles.evidenciaContainer}>
              <Text style={styles.evidenciaLabel}>Evidencia fotográfica:</Text>

              <View style={styles.evidenciaBotones}>
                <TouchableOpacity style={styles.evidenciaBoton} onPress={tomarFoto}>
                  <Feather name="camera" size={20} color="#1E5F74" />
                  <Text style={styles.evidenciaBotonTexto}>Tomar foto</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.evidenciaBoton} onPress={seleccionarImagen}>
                  <Feather name="image" size={20} color="#1E5F74" />
                  <Text style={styles.evidenciaBotonTexto}>Galería</Text>
                </TouchableOpacity>
              </View>

              {imagenEvidencia && (
                <View style={styles.imagenPreviewContainer}>
                  <Image source={{ uri: imagenEvidencia }} style={styles.imagenPreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.eliminarImagenBtn} onPress={() => setImagenEvidencia(null)}>
                    <Feather name="x" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.modalBoton, styles.modalBotonSecundario]}
                onPress={() => {
                  setMostrarFinalizarModal(false)
                  setComentarioFinalizacion("")
                  setImagenEvidencia(null)
                  setMostrarDetalles(true)
                }}
                disabled={finalizandoTarea || subiendoImagen}
              >
                <Text style={styles.modalBotonTextoSecundario}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBoton,
                  styles.modalBotonPrimario,
                  (finalizandoTarea || subiendoImagen) && styles.botonDeshabilitado,
                ]}
                onPress={finalizarTarea}
                disabled={finalizandoTarea || subiendoImagen}
              >
                {finalizandoTarea || subiendoImagen ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBotonTextoPrimario}>Finalizar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  )

  // Modal para cambiar fecha de vencimiento
  const renderCambiarFechaModal = () => (
    <Modal
      visible={mostrarCambiarFechaModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setMostrarCambiarFechaModal(false)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.finalizarModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.finalizarModalTitulo}>Cambiar Fecha de Vencimiento</Text>
              <TouchableOpacity onPress={() => setMostrarCambiarFechaModal(false)}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.finalizarModalSubtitulo}>
              Ingresa una nueva fecha y proporciona una razón para el cambio
            </Text>

            <View style={styles.fechaPickerContainer}>
              <Text style={styles.fechaPickerLabel}>Nueva fecha de vencimiento (DD-MM-YYYY):</Text>

              <View style={styles.fechaInputContainer}>
                <Feather name="calendar" size={20} color="#171321" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.fechaInput}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor="#999"
                  value={fechaInputText}
                  onChangeText={handleFechaChange}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {fechaError ? (
                <Text style={styles.fechaErrorText}>{fechaError}</Text>
              ) : (
                <Text style={styles.fechaHelperText}>Formato: día-mes-año (ejemplo: 25-12-2023)</Text>
              )}
            </View>

            <TextInput
              style={styles.comentarioInput}
              placeholder="Razón del cambio de fecha..."
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={3}
              value={razonCambioFecha}
              onChangeText={setRazonCambioFecha}
            />

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.modalBoton, styles.modalBotonSecundario]}
                onPress={() => {
                  setMostrarCambiarFechaModal(false)
                  setRazonCambioFecha("")
                  setFechaInputText("")
                  setFechaError("")
                  setMostrarDetalles(true)
                }}
                disabled={actualizandoFecha}
              >
                <Text style={styles.modalBotonTextoSecundario}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBoton, styles.modalBotonPrimario, actualizandoFecha && styles.botonDeshabilitado]}
                onPress={cambiarFechaVencimiento}
                disabled={actualizandoFecha}
              >
                {actualizandoFecha ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBotonTextoPrimario}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  )

  const renderTareaCard = (tarea) => {
    const miembroAsignado = miembros.find((m) => m.userId === tarea.asignadoA)
    const prioridad = PRIORIDADES[tarea.prioridad] || PRIORIDADES.media

    return (
      <TouchableOpacity
        key={tarea.id}
        style={[styles.tareaCard, { borderLeftColor: prioridad.color }]}
        onPress={() => {
          setTareaSeleccionada(tarea)
          setMostrarDetalles(true)
        }}
      >
        <Text style={styles.tareaTitulo}>{tarea.titulo}</Text>
        <Text style={styles.tareaDescripcion} numberOfLines={2}>
          {tarea.descripcion}
        </Text>
        <View style={styles.tareaDetalles}>
          <View style={styles.tareaDetalleItem}>
            <Feather name="user" size={16} color="#1E5F74" />
            <Text style={styles.tareaAsignado}>{miembroAsignado?.username || "Usuario no encontrado"}</Text>
          </View>
          <View style={styles.tareaDetalleItem}>
            <Feather name="calendar" size={16} color="#1E5F74" />
            <Text style={styles.tareaFecha}>{formatearFecha(tarea.fechaVencimiento)}</Text>
          </View>
        </View>
        <View style={styles.tareaEstadoContainer}>
          <View style={[styles.prioridadBadge, { backgroundColor: prioridad.color }]}>
            <Text style={styles.prioridadText}>{prioridad.label}</Text>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(tarea.estado) }]}>
            <Text style={styles.estadoText}>{tarea.estado}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  // Actualizar la función getEstadoColor para usar los nuevos colores
  const getEstadoColor = (estado) => {
    switch (estado) {
      case "Completada":
        return "#4CAF50"
      case "En Progreso":
        return "#FFA000"
      case "Pendiente":
        return "#FFA000"
      default:
        return "#666"
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5F74" />
      </View>
    )
  }

  const tareasPorEstado = getTareasPorEstado()

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E5F74" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tareas del Proyecto</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, seccionActiva === "pendientes" && styles.tabActivo]}
          onPress={() => setSeccionActiva("pendientes")}
        >
          <Text style={[styles.tabText, seccionActiva === "pendientes" && styles.tabTextoActivo]}>
            En Progreso ({tareasPorEstado.pendientes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, seccionActiva === "completadas" && styles.tabActivo]}
          onPress={() => setSeccionActiva("completadas")}
        >
          <Text style={[styles.tabText, seccionActiva === "completadas" && styles.tabTextoActivo]}>
            Finalizadas ({tareasPorEstado.completadas.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, seccionActiva === "vencidas" && styles.tabActivo]}
          onPress={() => setSeccionActiva("vencidas")}
        >
          <Text style={[styles.tabText, seccionActiva === "vencidas" && styles.tabTextoActivo]}>
            Vencidas ({tareasPorEstado.vencidas.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtrosHeader}>
        <TouchableOpacity style={styles.filtrosBoton} onPress={() => setMostrarFiltros(true)}>
          <Feather name="filter" size={20} color="#171321" />
          <Text style={styles.filtrosBotonTexto}>Filtros</Text>
          {(filtros.prioridad || filtros.usuario) && (
            <View style={styles.filtrosBadge}>
              <Text style={styles.filtrosBadgeTexto}>{(filtros.prioridad ? 1 : 0) + (filtros.usuario ? 1 : 0)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {seccionActiva === "pendientes" && (
          <View style={styles.seccion}>
            {tareasPorEstado.pendientes.map(renderTareaCard)}
            {tareasPorEstado.pendientes.length === 0 && (
              <View style={styles.emptyContainer}>
                <Feather name="clipboard" size={50} color="#BBBBBB" />
                <Text style={styles.emptyMessage}>No hay tareas en progreso</Text>
              </View>
            )}
          </View>
        )}

        {seccionActiva === "completadas" && (
          <View style={styles.seccion}>
            {tareasPorEstado.completadas.map(renderTareaCard)}
            {tareasPorEstado.completadas.length === 0 && (
              <View style={styles.emptyContainer}>
                <Feather name="check-circle" size={50} color="#BBBBBB" />
                <Text style={styles.emptyMessage}>No hay tareas finalizadas</Text>
              </View>
            )}
          </View>
        )}

        {seccionActiva === "vencidas" && (
          <View style={styles.seccion}>
            {tareasPorEstado.vencidas.map(renderTareaCard)}
            {tareasPorEstado.vencidas.length === 0 && (
              <View style={styles.emptyContainer}>
                <Feather name="alert-circle" size={50} color="#BBBBBB" />
                <Text style={styles.emptyMessage}>No hay tareas vencidas</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {renderFiltros()}
      {renderDetallesTarea()}
      {renderFinalizarModal()}
      {renderCambiarFechaModal()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 10,
  },
  tabsContainer: {
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
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActivo: {
    borderBottomColor: "#1E5F74",
  },
  tabText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  tabTextoActivo: {
    color: "#1E5F74",
    fontWeight: "bold",
  },
  filtrosHeader: {
    padding: 16,
  },
  filtrosBoton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    elevation: 2,
  },
  filtrosBotonTexto: {
    color: "#1E5F74",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  filtrosBadge: {
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  filtrosBadgeTexto: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 6,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: "60%",
    maxHeight: "90%",
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
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  filtroSeccion: {
    marginBottom: 20,
  },
  filtroTituloContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  filtroTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginLeft: 8,
  },
  filtroOpciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filtroOpcion: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filtroOpcionTexto: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
  modalBotones: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalBoton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  modalBotonPrimario: {
    backgroundColor: "#1E5F74",
    marginLeft: 10,
  },
  modalBotonSecundario: {
    backgroundColor: "#F0F0F0",
    marginRight: 10,
  },
  modalBotonTextoPrimario: {
    color: "#fff",
    fontWeight: "600",
  },
  modalBotonTextoSecundario: {
    color: "#666",
    fontWeight: "600",
  },
  seccion: {
    marginBottom: 24,
  },
  tareaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  tareaTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  tareaDescripcion: {
    fontSize: 14,
    color: "#555",
    marginBottom: 12,
  },
  tareaDetalles: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tareaDetalleItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  tareaAsignado: {
    fontSize: 14,
    color: "#555",
    marginLeft: 6,
  },
  tareaFecha: {
    fontSize: 14,
    color: "#555",
    marginLeft: 6,
  },
  tareaEstadoContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 8,
  },
  prioridadBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prioridadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    padding: 20,
  },
  emptyMessage: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#333",
    fontSize: 16,
    paddingVertical: 12,
  },
  resultadosBusqueda: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    elevation: 2,
    maxHeight: 200,
  },
  resultadoBusqueda: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  resultadoAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E5F74",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  resultadoAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  resultadoInfo: {
    flex: 1,
  },
  resultadoNombre: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  resultadoRol: {
    fontSize: 12,
    color: "#666",
  },
  noResultadosContainer: {
    alignItems: "center",
    padding: 20,
  },
  noResultados: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
  },
  // Estilos para el modal de detalles
  detallesModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
    minHeight: "60%",
  },
  detallesTitulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  cerrarBoton: {
    padding: 8,
  },
  detallesScroll: {
    flex: 1,
  },
  detallesSubtitulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  detallesDescripcion: {
    fontSize: 16,
    color: "#555",
    marginBottom: 16,
    lineHeight: 24,
  },
  detallesInfoContainer: {
    marginTop: 16,
  },
  detallesInfoItem: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detallesInfoLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  detallesInfoValor: {
    fontSize: 16,
    color: "#333",
    marginTop: 4,
  },
  textoVencido: {
    color: "#FF6B6B",
    fontWeight: "bold",
  },
  textoProximoVencer: {
    color: "#FF9800",
    fontWeight: "bold",
  },
  finalizarBoton: {
    backgroundColor: "#1E5F74",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  finalizarBotonTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Estilos para el modal de finalización
  finalizarModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  finalizarModalTitulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  finalizarModalSubtitulo: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  comentarioInput: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#333",
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  botonDeshabilitado: {
    opacity: 0.7,
  },
  // Estilos para cambiar fecha
  fechaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editarFechaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  editarFechaText: {
    color: "#1E5F74",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "500",
  },
  fechaPickerContainer: {
    marginBottom: 20,
  },
  fechaPickerLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 10,
  },
  fechaInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  fechaInput: {
    flex: 1,
    color: "#333",
    fontSize: 16,
    paddingVertical: 12,
  },
  fechaErrorText: {
    color: "#FF6B6B",
    fontSize: 12,
    marginTop: 4,
  },
  fechaHelperText: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
  cambiofechaItem: {
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cambioFechaTexto: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  cambioFechaLabel: {
    fontWeight: "bold",
    color: "#333",
  },
  // Estilos para la evidencia de imagen
  evidenciaContainer: {
    marginBottom: 20,
  },
  evidenciaLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 10,
  },
  evidenciaBotones: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  evidenciaBoton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  evidenciaBotonTexto: {
    color: "#1E5F74",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  imagenPreviewContainer: {
    position: "relative",
    marginTop: 10,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  imagenPreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  eliminarImagenBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgb(255, 255, 255)",
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  evidenciaImagenContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  evidenciaImagenThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  verImagenText: {
    color: "#1E5F74",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  // Estilos para previsualización de imagen a pantalla completa
  imagenAmpliadaContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgb(255, 255, 255)",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  imagenAmpliada: {
    width: 300,
    height: 400,
    borderRadius: 8,
  },
  cerrarImagenAmpliadaBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 11,
  },
  // Estilos para filtros mejorados
  usuarioSeleccionadoContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  usuarioSeleccionadoLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  usuarioSeleccionado: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E5F74",
  },
  usuarioAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E5F74",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  usuarioAvatarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  usuarioNombre: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  eliminarUsuarioBtn: {
    padding: 5,
  },
  filtrosActivos: {
    marginTop: 10,
    marginBottom: 20,
  },
  filtrosActivosLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 8,
  },
  filtrosActivosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filtroActivoTag: {
    backgroundColor: "#1E5F74",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filtroActivoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
});