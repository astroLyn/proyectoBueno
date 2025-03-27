import { Text, StyleSheet, TouchableOpacity, Animated } from "react-native"
import Icon from "react-native-vector-icons/Feather"
import { useNavigation, useRoute } from "@react-navigation/native"

const navigationItems = [
  { id: "home", icon: "home", label: "Inicio", screen: "Home" },
  { id: "work", icon: "calendar", label: "Archivados", screen: "Proyectos" },
  { id: "notifications", icon: "bell", label: "Notificaciones", screen: "Notificaciones" },
  { id: "profile", icon: "user", label: "Perfil", screen: "Perfi" },
]

const BottomNav = () => {
  const navigation = useNavigation()
  const route = useRoute()

  const handleNavigation = (screen) => {
    navigation.navigate(screen)
  }

  const isActive = (screen) => {
    return route.name === screen
  }

  return (
    <Animated.View style={styles.bottomNav}>
      {navigationItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.navItem, isActive(item.screen) && styles.activeNavItem]}
          onPress={() => handleNavigation(item.screen)}
        >
          <Icon name={item.icon} size={24} color={isActive(item.screen) ? "#171321" : "#666"} />
          <Text style={[styles.navText, isActive(item.screen) && styles.activeNavText]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 20,
    position: "absolute",
    bottom: 20,
    left: 10,
    right: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  navItem: {
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    minWidth: 64,
  },
  activeNavItem: {
    backgroundColor: "#F2F2F2",
  },
  navText: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "400",
  },
  activeNavText: {
    color: "#171321",
    fontWeight: "600",
  },
})

export default BottomNav

