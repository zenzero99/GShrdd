import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import DashboardScreen from './src/screens/DashboardScreen';
import LogScreen from './src/screens/LogScreen';
import AICoachScreen from './src/screens/AICoachScreen';
import Icon, { IconName } from './src/components/Icon';
import { colors } from './src/theme';
import { View } from 'react-native';
import { AppStateProvider, useAppState } from './src/state/AppState';

const Tab = createBottomTabNavigator();

const navTheme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: '#161617', border: colors.sep, primary: colors.green } };

const icon = (name: IconName) => ({ color }: { color: string }) => <Icon name={name} size={24} strokeWidth={1.9} color={color} />;

// Holds the tabs back until saved data has loaded, so screens never flash empty.
function Ready({ children }: { children: React.ReactNode }) {
  return useAppState().ready ? <>{children}</> : <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
      <StatusBar style="light" />
      <Ready>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: { backgroundColor: '#161617', borderTopColor: colors.sep },
            tabBarActiveTintColor: colors.green,
            tabBarInactiveTintColor: colors.ink3,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          }}
        >
          <Tab.Screen name="Summary" component={DashboardScreen} options={{ tabBarIcon: icon('summary') }} />
          <Tab.Screen name="Log" component={LogScreen} options={{ tabBarIcon: icon('log') }} />
          <Tab.Screen name="Coach" component={AICoachScreen} options={{ tabBarIcon: icon('coach') }} />
        </Tab.Navigator>
      </NavigationContainer>
      </Ready>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
