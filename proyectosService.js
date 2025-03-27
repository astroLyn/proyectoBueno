import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore"
import { auth, db } from "../proyecto/firebaseConfig"

const PROYECTOS_COLLECTION = "proyectos"
const MIEMBROS_COLLECTION = "miembros_proyecto"
const TAREAS_COLLECTION = "tareas"
const USUARIOS_COLLECTION = "usuarios"

// Crear un proyecto
export const crearProyecto = async (proyecto) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    // Crear el proyecto con el usuario actual como gerente
    const proyectoData = {
      ...proyecto,
      gerente: user.uid,
      gerenteEmail: user.email,
      gerenteUsername: user.displayName || user.email,
      fechaCreacion: new Date().toISOString(),
      estado: "Activo",
    }

    const docRef = await addDoc(collection(db, PROYECTOS_COLLECTION), proyectoData)

    // Agregar al gerente como miembro del proyecto con rol "Gerente"
    await addDoc(collection(db, MIEMBROS_COLLECTION), {
      proyectoId: docRef.id,
      userId: user.uid,
      rol: "Gerente",
      email: user.email,
      username: user.displayName || user.email,
      fechaInvitacion: new Date().toISOString(),
      estado: "aceptado",
    })

    return docRef.id
  } catch (error) {
    console.error("Error al agregar proyecto:", error)
    throw error
  }
}

// Obtener proyectos con filtro de estado
export const obtenerProyectos = async (estado = "Activo") => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    const miembrosQuery = query(
      collection(db, MIEMBROS_COLLECTION),
      where("userId", "==", user.uid),
      where("estado", "==", "aceptado"),
    )

    const miembrosSnapshot = await getDocs(miembrosQuery)
    const proyectosIds = miembrosSnapshot.docs.map((doc) => doc.data().proyectoId)

    if (proyectosIds.length === 0) return []

    const proyectosQuery = query(collection(db, PROYECTOS_COLLECTION), where("estado", "==", estado))

    const querySnapshot = await getDocs(proyectosQuery)

    const proyectos = []
    querySnapshot.forEach((doc) => {
      if (proyectosIds.includes(doc.id)) {
        proyectos.push({ id: doc.id, ...doc.data() })
      }
    })

    return proyectos
  } catch (error) {
    console.error("Error al obtener proyectos:", error)
    throw error
  }
}

// Finalizar proyecto
export const finalizarProyecto = async (proyectoId) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    const proyectoRef = doc(db, PROYECTOS_COLLECTION, proyectoId)
    const proyectoDoc = await getDoc(proyectoRef)

    if (!proyectoDoc.exists()) {
      throw new Error("Proyecto no encontrado")
    }

    // Verificar que el proyecto no esté ya finalizado
    if (proyectoDoc.data().estado === "Finalizado") {
      throw new Error("El proyecto ya está finalizado")
    }

    // Verificar que sea el Gerente
    const miembroQuery = query(
      collection(db, MIEMBROS_COLLECTION),
      where("proyectoId", "==", proyectoId),
      where("userId", "==", user.uid),
      where("estado", "==", "aceptado"),
      where("rol", "==", "Gerente"),
    )

    const miembroSnap = await getDocs(miembroQuery)
    if (miembroSnap.empty) {
      throw new Error("Solo el Gerente puede finalizar el proyecto")
    }

    await updateDoc(proyectoRef, {
      estado: "Finalizado",
      fechaFinalizacion: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error al finalizar proyecto:", error)
    throw error
  }
}

// Obtener miembros de un proyecto
export const obtenerMiembrosProyecto = async (proyectoId) => {
  try {
    const miembrosRef = collection(db, MIEMBROS_COLLECTION)
    const q = query(miembrosRef, where("proyectoId", "==", proyectoId), where("estado", "==", "aceptado"))

    const querySnapshot = await getDocs(q)
    const miembros = []

    for (const docSnapshot of querySnapshot.docs) {
      const miembroData = docSnapshot.data()
      try {
        const userDocRef = doc(db, USUARIOS_COLLECTION, miembroData.userId)
        const userDocSnapshot = await getDoc(userDocRef)
        const userData = userDocSnapshot.data()

        // Asegúrate de incluir profileImage si existe
        miembros.push({
          id: docSnapshot.id,
          ...miembroData,
          username: userData?.username || miembroData.email,
          profileImage: userData?.profileImage || null,
        })

        console.log(`Miembro ${miembroData.userId} tiene imagen: ${userData?.profileImage ? "Sí" : "No"}`)
      } catch (error) {
        console.error("Error al obtener datos del usuario:", error)
        miembros.push({
          id: docSnapshot.id,
          ...miembroData,
          username: miembroData.email,
        })
      }
    }

    return miembros
  } catch (error) {
    console.error("Error al obtener miembros:", error)
    throw error
  }
}

// Invitar usuario al proyecto
export const invitarUsuario = async (proyectoId, emailUsuario, rol) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    const proyectoRef = doc(db, PROYECTOS_COLLECTION, proyectoId)
    const proyectoDoc = await getDoc(proyectoRef)

    if (!proyectoDoc.exists()) throw new Error("Proyecto no encontrado")

    // Verificar que el proyecto no esté finalizado
    if (proyectoDoc.data().estado === "Finalizado") {
      throw new Error("No se pueden invitar usuarios a un proyecto finalizado")
    }

    // Verificar que el usuario que invita sea Gerente o Supervisor
    const miembroActualQuery = query(
      collection(db, MIEMBROS_COLLECTION),
      where("proyectoId", "==", proyectoId),
      where("userId", "==", user.uid),
      where("estado", "==", "aceptado"),
    )

    const miembroActualSnap = await getDocs(miembroActualQuery)
    if (miembroActualSnap.empty) throw new Error("No tienes permisos para invitar usuarios")

    const rolActual = miembroActualSnap.docs[0].data().rol

    // Verificar permisos según el rol
    if (rolActual !== "Gerente" && rolActual !== "Supervisor") {
      throw new Error("No tienes permisos para invitar usuarios")
    }

    // Si es Supervisor, solo puede invitar como Empleado
    if (rolActual === "Supervisor" && rol !== "Empleado") {
      throw new Error("Como Supervisor, solo puedes invitar usuarios con el rol de Empleado")
    }

    // Buscar si el usuario ya está invitado
    const miembrosQuery = query(
      collection(db, MIEMBROS_COLLECTION),
      where("proyectoId", "==", proyectoId),
      where("email", "==", emailUsuario),
    )

    const miembrosSnapshot = await getDocs(miembrosQuery)
    if (!miembrosSnapshot.empty) {
      throw new Error("Este usuario ya ha sido invitado al proyecto")
    }

    // Crear la invitación
    await addDoc(collection(db, MIEMBROS_COLLECTION), {
      proyectoId,
      email: emailUsuario,
      rol,
      fechaInvitacion: new Date().toISOString(),
      estado: "pendiente",
    })
  } catch (error) {
    console.error("Error al invitar usuario:", error)
    throw error
  }
}

// Eliminar miembro del proyecto
export const eliminarMiembro = async (proyectoId, miembroId) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    const proyectoRef = doc(db, PROYECTOS_COLLECTION, proyectoId)
    const proyectoDoc = await getDoc(proyectoRef)

    if (!proyectoDoc.exists()) throw new Error("Proyecto no encontrado")

    // Verificar que el proyecto no esté finalizado
    if (proyectoDoc.data().estado === "Finalizado") {
      throw new Error("No se pueden eliminar miembros de un proyecto finalizado")
    }

    if (proyectoDoc.data().gerente !== user.uid) {
      throw new Error("Solo el gerente puede eliminar miembros")
    }

    await deleteDoc(doc(db, MIEMBROS_COLLECTION, miembroId))
  } catch (error) {
    console.error("Error al eliminar miembro:", error)
    throw error
  }
}

// Enviar notificación
export const enviarNotificacion = async (notificacion) => {
  try {
    // Crear la notificación en Firestore
    const docRef = await addDoc(collection(db, "notificaciones"), {
      ...notificacion,
      fechaCreacion: new Date().toISOString(),
    })

    return docRef.id
  } catch (error) {
    console.error("Error al enviar notificación:", error)
    throw error
  }
}

// Marcar notificación como leída
export const marcarNotificacionLeida = async (notificacionId) => {
  try {
    const notificacionRef = doc(db, "notificaciones", notificacionId)
    await updateDoc(notificacionRef, {
      leido: true,
      fechaLectura: new Date().toISOString(),
    })

    return true
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error)
    throw error
  }
}

// Obtener notificaciones
export const obtenerNotificaciones = async (userId) => {
  try {
    if (!userId) throw new Error("Usuario no especificado")

    // Obtener invitaciones pendientes
    const invitacionesQuery = query(
      collection(db, MIEMBROS_COLLECTION),
      where("email", "==", auth.currentUser.email),
      where("estado", "==", "pendiente"),
    )

    const invitacionesSnapshot = await getDocs(invitacionesQuery)
    const notificaciones = []

    // Procesar invitaciones
    for (const docSnap of invitacionesSnapshot.docs) {
      const invitacion = docSnap.data()
      const proyectoRef = doc(db, PROYECTOS_COLLECTION, invitacion.proyectoId)
      const proyectoSnap = await getDoc(proyectoRef)

      if (proyectoSnap.exists()) {
        notificaciones.push({
          id: docSnap.id,
          tipo: "invitacion",
          nombreProyecto: proyectoSnap.data().nombre,
          fechaInvitacion: invitacion.fechaInvitacion,
          ...invitacion,
        })
      }
    }

    // Obtener tareas asignadas
    const tareasQuery = query(
      collection(db, TAREAS_COLLECTION),
      where("asignadoA", "==", userId),
      where("estado", "!=", "Completada"),
    )

    const tareasSnapshot = await getDocs(tareasQuery)

    // Procesar tareas
    for (const docSnap of tareasSnapshot.docs) {
      const tarea = docSnap.data()
      const proyectoRef = doc(db, PROYECTOS_COLLECTION, tarea.proyectoId)
      const proyectoSnap = await getDoc(proyectoRef)

      if (proyectoSnap.exists() && proyectoSnap.data().estado !== "Finalizado") {
        notificaciones.push({
          id: docSnap.id,
          tipo: "tarea",
          proyecto: {
            id: tarea.proyectoId,
            ...proyectoSnap.data(),
          },
          ...tarea,
        })
      }
    }

    // Obtener notificaciones de cambio de fecha
    const notificacionesQuery = query(
      collection(db, "notificaciones"),
      where("usuarioId", "==", userId),
      where("tipo", "==", "cambio_fecha"),
    )

    const notificacionesSnapshot = await getDocs(notificacionesQuery)

    // Procesar notificaciones de cambio de fecha
    for (const docSnap of notificacionesSnapshot.docs) {
      const notificacion = docSnap.data()

      // Obtener información del proyecto
      if (notificacion.datos && notificacion.datos.proyectoId) {
        const proyectoRef = doc(db, PROYECTOS_COLLECTION, notificacion.datos.proyectoId)
        const proyectoSnap = await getDoc(proyectoRef)

        if (proyectoSnap.exists()) {
          // Obtener información de la tarea
          if (notificacion.datos.tareaId) {
            const tareaRef = doc(db, TAREAS_COLLECTION, notificacion.datos.tareaId)
            const tareaSnap = await getDoc(tareaRef)

            if (tareaSnap.exists()) {
              notificaciones.push({
                id: docSnap.id,
                ...notificacion,
                proyecto: {
                  id: notificacion.datos.proyectoId,
                  ...proyectoSnap.data(),
                },
                tarea: {
                  id: notificacion.datos.tareaId,
                  ...tareaSnap.data(),
                },
              })
            }
          } else {
            notificaciones.push({
              id: docSnap.id,
              ...notificacion,
              proyecto: {
                id: notificacion.datos.proyectoId,
                ...proyectoSnap.data(),
              },
            })
          }
        }
      } else {
        // Si no tiene información del proyecto, añadir la notificación tal cual
        notificaciones.push({
          id: docSnap.id,
          ...notificacion,
        })
      }
    }

    return notificaciones.sort((a, b) => {
      const fechaA = a.fechaInvitacion || a.fechaCreacion
      const fechaB = b.fechaInvitacion || b.fechaCreacion
      return new Date(fechaB) - new Date(fechaA)
    })
  } catch (error) {
    console.error("Error al obtener notificaciones:", error)
    throw error
  }
}

// Aceptar invitación
export const aceptarInvitacion = async (invitacionId) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    const invitacionRef = doc(db, MIEMBROS_COLLECTION, invitacionId)
    const invitacionDoc = await getDoc(invitacionRef)

    if (!invitacionDoc.exists()) throw new Error("Invitación no encontrada")
    if (invitacionDoc.data().email !== user.email) {
      throw new Error("Esta invitación no es para ti")
    }

    // Verificar que el proyecto no esté finalizado
    const proyectoRef = doc(db, PROYECTOS_COLLECTION, invitacionDoc.data().proyectoId)
    const proyectoDoc = await getDoc(proyectoRef)

    if (proyectoDoc.exists() && proyectoDoc.data().estado === "Finalizado") {
      throw new Error("No puedes aceptar una invitación a un proyecto finalizado")
    }

    await updateDoc(invitacionRef, {
      userId: user.uid,
      username: user.displayName || user.email,
      estado: "aceptado",
      fechaAceptacion: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error al aceptar invitación:", error)
    throw error
  }
}

// Rechazar invitación
export const rechazarInvitacion = async (invitacionId) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    const invitacionRef = doc(db, MIEMBROS_COLLECTION, invitacionId)
    const invitacionDoc = await getDoc(invitacionRef)

    if (!invitacionDoc.exists()) throw new Error("Invitación no encontrada")
    if (invitacionDoc.data().email !== user.email) {
      throw new Error("Esta invitación no es para ti")
    }

    await deleteDoc(invitacionRef)
  } catch (error) {
    console.error("Error al rechazar invitación:", error)
    throw error
  }
}

// Crear tarea
export const crearTarea = async (tarea) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    // Verificar acceso al proyecto
    const tieneAcceso = await verificarAccesoProyecto(tarea.proyectoId)
    if (!tieneAcceso) throw new Error("No tienes acceso a este proyecto")

    // Verificar que el proyecto no esté finalizado
    const proyectoRef = doc(db, PROYECTOS_COLLECTION, tarea.proyectoId)
    const proyectoDoc = await getDoc(proyectoRef)

    if (proyectoDoc.exists() && proyectoDoc.data().estado === "Finalizado") {
      throw new Error("No se pueden crear tareas en un proyecto finalizado")
    }

    const docRef = await addDoc(collection(db, TAREAS_COLLECTION), {
      ...tarea,
      creadaPor: user.uid,
      fechaCreacion: new Date().toISOString().split("T")[0],
      estado: "Pendiente",
      comentarios: [],
    })

    return docRef.id
  } catch (error) {
    console.error("Error al crear la tarea:", error)
    throw error
  }
}

// Obtener tareas del proyecto
export const obtenerTareasProyecto = async (proyectoId) => {
  try {
    const tieneAcceso = await verificarAccesoProyecto(proyectoId)
    if (!tieneAcceso) throw new Error("No tienes acceso a este proyecto")

    const tareasRef = collection(db, TAREAS_COLLECTION)
    const q = query(tareasRef, where("proyectoId", "==", proyectoId))
    const querySnapshot = await getDocs(q)

    const tareas = []
    querySnapshot.forEach((doc) => {
      tareas.push({ id: doc.id, ...doc.data() })
    })

    return tareas
  } catch (error) {
    console.error("Error al obtener tareas:", error)
    throw error
  }
}

// Obtener estadísticas de tareas
export const obtenerEstadisticasTareas = async (proyectoId) => {
  try {
    const tareas = await obtenerTareasProyecto(proyectoId)

    const completadas = tareas.filter((t) => t.estado === "Completada").length
    const total = tareas.length
    const vencidas = tareas.filter((t) => {
      const fechaEstimada = new Date(t.fechaEstimadaFinalizacion)
      const hoy = new Date()
      return fechaEstimada < hoy && t.estado !== "Completada"
    }).length
    const actualizadas = tareas.filter((t) => t.estado === "En Progreso").length

    return {
      completadas,
      total,
      vencidas,
      actualizadas,
    }
  } catch (error) {
    console.error("Error al obtener estadísticas:", error)
    throw error
  }
}

// Actualizar tarea
export const actualizarTarea = async (proyectoId, tarea) => {
  try {
    const tareaRef = doc(db, TAREAS_COLLECTION, tarea.id)

    // Creamos un objeto con los campos a actualizar
    const datosActualizados = {
      estado: tarea.estado,
    }

    // Si hay comentario de finalización, lo incluimos
    if (tarea.comentarioFinalizacion) {
      datosActualizados.comentarioFinalizacion = tarea.comentarioFinalizacion
    }

    // Si hay fecha de finalización, la incluimos
    if (tarea.fechaFinalizacion) {
      datosActualizados.fechaFinalizacion = tarea.fechaFinalizacion
    }

    // Si hay una URL de imagen, la incluimos en la actualización
    if (tarea.evidenciaImagen) {
      datosActualizados.evidenciaImagen = tarea.evidenciaImagen
    }

    // Si hay cambio en la fecha de vencimiento, la actualizamos
    if (tarea.fechaVencimiento) {
      datosActualizados.fechaVencimiento = tarea.fechaVencimiento
    }

    // Si hay historial de cambios de fecha, lo incluimos
    if (tarea.cambiosFecha) {
      datosActualizados.cambiosFecha = tarea.cambiosFecha
    }

    await updateDoc(tareaRef, datosActualizados)
    return true
  } catch (error) {
    console.error("Error al actualizar tarea:", error)
    throw error
  }
}

// Verificar acceso al proyecto
export const verificarAccesoProyecto = async (proyectoId) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    const miembrosQuery = query(
      collection(db, MIEMBROS_COLLECTION),
      where("proyectoId", "==", proyectoId),
      where("userId", "==", user.uid),
      where("estado", "==", "aceptado"),
    )

    const snapshot = await getDocs(miembrosQuery)
    return !snapshot.empty
  } catch (error) {
    console.error("Error al verificar acceso:", error)
    throw error
  }
}

// Modificar la función verificarPermisos para considerar proyectos archivados
export const verificarPermisos = async (proyectoId, permisoRequerido) => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("Usuario no autenticado")

    // Verificar si el proyecto está archivado
    const proyectoRef = doc(db, PROYECTOS_COLLECTION, proyectoId)
    const proyectoDoc = await getDoc(proyectoRef)

    if (!proyectoDoc.exists()) throw new Error("Proyecto no encontrado")

    // Si el proyecto está finalizado, no se permiten acciones de modificación
    if (proyectoDoc.data().estado === "Finalizado") {
      switch (permisoRequerido) {
        case "ver_proyecto":
        case "ver_tareas":
          return true // Solo se permite ver información
        default:
          return false // Cualquier otra acción está bloqueada
      }
    }

    const miembroQuery = query(
      collection(db, MIEMBROS_COLLECTION),
      where("proyectoId", "==", proyectoId),
      where("userId", "==", user.uid),
      where("estado", "==", "aceptado"),
    )

    const miembroSnap = await getDocs(miembroQuery)
    if (miembroSnap.empty) return false

    const rol = miembroSnap.docs[0].data().rol

    // Verificar si es Gerente primero
    if (rol === "Gerente") {
      return true // El Gerente tiene todos los permisos
    }

    // Para otros roles, verificar permisos específicos
    switch (permisoRequerido) {
      case "invitar":
        return rol === "Supervisor"
      case "eliminar_proyecto":
      case "finalizar_proyecto":
      case "eliminar_miembro":
      case "cambiar_fecha_vencimiento": // Nuevo permiso para cambiar fecha
        return false // Solo el Gerente puede hacer estas acciones
      case "crear_tarea":
        return rol === "Supervisor"
      case "ver_proyecto":
      case "ver_tareas":
        return true // Todos los roles pueden ver
      case "gestionar_tarea":
        return rol === "Supervisor" || rol === "Empleado"
      default:
        return false
    }
  } catch (error) {
    console.error("Error al verificar permisos:", error)
    return false
  }
}

// Actualizar la función subirImagenEvidencia para usar Cloudinary
export const subirImagenEvidencia = async (proyectoId, tareaId, uri) => {
  try {
    // Crear un FormData para enviar la imagen a Cloudinary
    const formData = new FormData()

    // Obtener el nombre del archivo de la URI
    const uriParts = uri.split(".")
    const fileType = uriParts[uriParts.length - 1]

    // Agregar la imagen al FormData
    formData.append("file", {
      uri,
      name: `tarea_${tareaId}_${Date.now()}.${fileType}`,
      type: `image/${fileType}`,
    })

    // Agregar parámetros de configuración de Cloudinary
    formData.append("upload_preset", "datosproyecto") // Reemplazar con tu upload preset de Cloudinary
    formData.append("folder", `proyecto4d/${proyectoId}/tareas`)

    // Enviar la imagen a Cloudinary
    const response = await fetch("https://api.cloudinary.com/v1_1/doze2qu0s/image/upload", {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
        "Content-Type": "multipart/form-data",
      },
    })

    const data = await response.json()

    // Verificar si la carga fue exitosa
    if (response.ok) {
      return data.secure_url
    } else {
      throw new Error(data.error?.message || "Error al subir imagen a Cloudinary")
    }
  } catch (error) {
    console.error("Error al subir imagen:", error)
    throw error
  }
}

// Función para formatear la fecha de YYYY-MM-DD o ISO a DD-MM-YYYY
export const formatearFecha = (fecha) => {
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

