import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useServicesStore } from '../stores/servicesStore';

const ServicesScreen = ({ route }) => {
  const { category } = route.params || {};
  const [location, setLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { services, loading, fetchServices, saveService, unsaveService, savedServices } = useServicesStore();

  useEffect(() => {
    loadServices();
  }, [category]);

  const loadServices = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      await fetchServices(
        loc.coords.latitude,
        loc.coords.longitude,
        category
      );
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const getDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const openDirections = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const renderService = ({ item }) => {
    const isSaved = savedServices.includes(item.id);

    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{item.name}</Text>
            <Text style={styles.serviceCategory}>{item.category}</Text>
          </View>
          <TouchableOpacity
            onPress={() => isSaved ? unsaveService(item.id) : saveService(item.id)}
          >
            <Text style={styles.saveIcon}>{isSaved ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
        </View>

        {item.distance_meters && (
          <Text style={styles.distance}>
            📍 {getDistance(item.distance_meters)} away
          </Text>
        )}

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {item.address && (
          <Text style={styles.address}>{item.address}</Text>
        )}

        <View style={styles.actionButtons}>
          {item.phone && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Linking.openURL(`tel:${item.phone}`)}
            >
              <Text style={styles.actionButtonText}>📞 Call</Text>
            </TouchableOpacity>
          )}
          {item.latitude && item.longitude && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openDirections(item.latitude, item.longitude)}
            >
              <Text style={styles.actionButtonText}>🗺️ Directions</Text>
            </TouchableOpacity>
          )}
        </View>

        {item.current_availability !== null && (
          <View style={[
            styles.availabilityBadge,
            { backgroundColor: item.current_availability > 0 ? '#4CAF50' : '#FF6F00' }
          ]}>
            <Text style={styles.availabilityText}>
              {item.current_availability > 0 ? `${item.current_availability} spots available` : 'Full'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && services.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Finding services nearby...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={services.filter(s =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderService}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No services found nearby</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadServices}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#616161',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    color: '#1976D2',
    textTransform: 'capitalize',
  },
  saveIcon: {
    fontSize: 24,
  },
  distance: {
    fontSize: 14,
    color: '#616161',
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: '#616161',
    marginTop: 8,
  },
  address: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  availabilityBadge: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  availabilityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#616161',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ServicesScreen;
