import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import api, { endpoints } from '../config/api';

const HomeScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [parkingStatus, setParkingStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocationAndCheckParking();
  }, []);

  const getLocationAndCheckParking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this app');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      // Check parking status
      const response = await api.get(endpoints.parkingCheck, {
        params: {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        },
      });

      setParkingStatus(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Location error:', error);
      setLoading(false);
    }
  };

  const handleEmergency = () => {
    Alert.alert(
      'Emergency Help',
      'Choose an emergency service:',
      [
        {
          text: 'Call 911',
          onPress: () => Linking.openURL('tel:911'),
        },
        {
          text: 'Mental Health Crisis',
          onPress: () => Linking.openURL('tel:4159704000'),
        },
        {
          text: 'Homeless Outreach',
          onPress: () => Linking.openURL('tel:4153557555'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const CategoryButton = ({ title, icon, onPress, color = '#1976D2' }) => (
    <TouchableOpacity
      style={[styles.categoryButton, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.categoryIcon}>{icon}</Text>
      <Text style={styles.categoryText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Emergency Button */}
      <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
        <Text style={styles.emergencyText}>🚨 EMERGENCY HELP</Text>
      </TouchableOpacity>

      {/* Parking Status */}
      {parkingStatus && (
        <View style={[
          styles.statusCard,
          { backgroundColor: parkingStatus.is_legal ? '#4CAF50' : '#FF6F00' }
        ]}>
          <Text style={styles.statusTitle}>Current Location</Text>
          <Text style={styles.statusText}>
            {parkingStatus.is_legal ? '✓ Safe to Park' : '⚠ Restricted Area'}
          </Text>
          {parkingStatus.time_limit_minutes && (
            <Text style={styles.statusSubtext}>
              Time Limit: {parkingStatus.time_limit_minutes} minutes
            </Text>
          )}
        </View>
      )}

      {/* Quick Access Categories */}
      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>Find Services</Text>

        <View style={styles.categoryRow}>
          <CategoryButton
            title="Food"
            icon="🍽️"
            onPress={() => navigation.navigate('Services', { category: 'food' })}
          />
          <CategoryButton
            title="Shelter"
            icon="🏠"
            onPress={() => navigation.navigate('Services', { category: 'shelter' })}
          />
        </View>

        <View style={styles.categoryRow}>
          <CategoryButton
            title="Healthcare"
            icon="🏥"
            onPress={() => navigation.navigate('Services', { category: 'healthcare' })}
          />
          <CategoryButton
            title="Showers"
            icon="🚿"
            onPress={() => navigation.navigate('Services', { category: 'hygiene' })}
          />
        </View>

        <View style={styles.categoryRow}>
          <CategoryButton
            title="RV Parking"
            icon="🚐"
            onPress={() => navigation.navigate('Map', { mode: 'parking' })}
            color="#FF6F00"
          />
          <CategoryButton
            title="Housing"
            icon="🏘️"
            onPress={() => navigation.navigate('Services', { category: 'housing' })}
            color="#4CAF50"
          />
        </View>
      </View>

      {/* Important Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📞 Important Numbers</Text>
        <TouchableOpacity onPress={() => Linking.openURL('tel:311')}>
          <Text style={styles.infoText}>311 - City Services</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('tel:4153557555')}>
          <Text style={styles.infoText}>SF Homeless Outreach: (415) 355-7555</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('tel:988')}>
          <Text style={styles.infoText}>988 - Suicide & Crisis Lifeline</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emergencyButton: {
    backgroundColor: '#D32F2F',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  emergencyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusCard: {
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    elevation: 2,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  statusText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statusSubtext: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  categoriesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212121',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryButton: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  categoryIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  categoryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#212121',
  },
  infoText: {
    fontSize: 16,
    color: '#1976D2',
    paddingVertical: 8,
  },
});

export default HomeScreen;
