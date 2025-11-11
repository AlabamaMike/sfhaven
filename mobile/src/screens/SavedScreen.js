import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useServicesStore } from '../stores/servicesStore';

const SavedScreen = () => {
  const { savedServices, services, loadSavedServices } = useServicesStore();

  useEffect(() => {
    loadSavedServices();
  }, []);

  const savedServiceData = services.filter(s => savedServices.includes(s.id));

  if (savedServices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>⭐</Text>
        <Text style={styles.emptyText}>No saved services yet</Text>
        <Text style={styles.emptySubtext}>
          Save services from the Services tab to access them quickly
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={savedServiceData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.serviceCard}>
            <Text style={styles.serviceName}>{item.name}</Text>
            <Text style={styles.serviceCategory}>{item.category}</Text>
            {item.address && (
              <Text style={styles.address}>{item.address}</Text>
            )}
          </View>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#616161',
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
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
  address: {
    fontSize: 14,
    color: '#616161',
    marginTop: 4,
  },
});

export default SavedScreen;
