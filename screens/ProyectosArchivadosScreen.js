import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { obtenerProyectos } from '../proyectosService';
import BottomNav from '../assets/BottomNav';
import { Feather } from '@expo/vector-icons';

export default function ProyectosArchivadosScreen({ navigation }) {
  const [proyectosPendientes, setProyectosPendientes] = useState([]);
  const [proyectosFinalizados, setProyectosFinalizados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarProyectos();
  }, []);

  const cargarProyectos = async () => {
    try {
      const [pendientes, finalizados] = await Promise.all([
        obtenerProyectos("Pendiente"),
        obtenerProyectos("Finalizado")
      ]);
      
      setProyectosPendientes(pendientes);
      setProyectosFinalizados(finalizados);
      setLoading(false);
    } catch (error) {
      console.error("Error al cargar proyectos:", error);
      setLoading(false);
    }
  };

  // Función para formatear la fecha de YYYY-MM-DD a DD-MM-YYYY
  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    const date = new Date(fecha);
    const dia = date.getDate().toString().padStart(2, "0");
    const mes = (date.getMonth() + 1).toString().padStart(2, "0");
    const anio = date.getFullYear();
    return `${dia}-${mes}-${anio}`;
  };

  const ProyectoCard = ({ proyecto }) => (
    <TouchableOpacity
      style={styles.proyectoCard}
      onPress={() => navigation.navigate('InfoProyectos', { proyecto })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.proyectoNombre}>{proyecto.nombre}</Text>
        <View style={[
          styles.estadoBadge,
          { backgroundColor: proyecto.estado === "Finalizado" ? "#4CAF50" : "#FF9800" }
        ]}>
          <Text style={styles.estadoTexto}>{proyecto.estado}</Text>
        </View>
      </View>
      <Text style={styles.proyectoDescripcion}>{proyecto.descripcion}</Text>
      <View style={styles.proyectoFooter}>
        <View style={styles.footerItem}>
          <Feather name="calendar" size={16} color="#1E5F74" />
          <Text style={styles.proyectoFecha}>
            {proyecto.estado === "Finalizado" 
              ? `Finalizado: ${formatearFecha(proyecto.fechaFinalizacion)}`
              : `Creado: ${formatearFecha(proyecto.fechaCreacion)}`
            }
          </Text>
        </View>
        {proyecto.cliente && (
          <View style={styles.footerItem}>
            <Feather name="user" size={16} color="#1E5F74" />
            <Text style={styles.proyectoCliente}>{proyecto.cliente}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E5F74" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E5F74" barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Proyectos Archivados</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {proyectosPendientes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Feather name="clock" size={20} color="#1E5F74" />
              <Text style={styles.sectionTitle}>Proyectos Pendientes</Text>
            </View>
            {proyectosPendientes.map((proyecto) => (
              <ProyectoCard key={proyecto.id} proyecto={proyecto} />
            ))}
          </View>
        )}

        {proyectosFinalizados.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
            </View>
            {proyectosFinalizados.map((proyecto) => (
              <ProyectoCard key={proyecto.id} proyecto={proyecto} />
            ))}
          </View>
        )}

        {proyectosPendientes.length === 0 && proyectosFinalizados.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="folder" size={50} color="#BBBBBB" />
            <Text style={styles.emptyStateText}>No hay proyectos archivados</Text>
          </View>
        )}
      </ScrollView>
      <BottomNav/>
    </View>
  );
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  proyectoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  proyectoNombre: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoTexto: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  proyectoDescripcion: {
    color: "#555",
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  proyectoFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  proyectoFecha: {
    color: "#666",
    fontSize: 14,
    marginLeft: 6,
  },
  proyectoCliente: {
    color: "#666",
    fontSize: 14,
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    color: "#666",
    fontSize: 16,
    marginTop: 12,
  },
});