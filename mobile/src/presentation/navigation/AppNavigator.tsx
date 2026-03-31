import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { RecipesScreen } from '../screens/RecipesScreen';
import { IngredientsScreen } from '../screens/IngredientsScreen';
import { CreateRecipeScreen } from '../screens/CreateRecipeScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { CreateIngredientScreen } from '../screens/CreateIngredientScreen';
import { SalesScreen } from '../screens/SalesScreen';
import { CreateSaleScreen } from '../screens/CreateSaleScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { OnboardingScreen, hasSeenOnboarding } from '../screens/OnboardingScreen';
import { tokenStorage } from '../../data/storage/tokenStorage';
import { authApi } from '../../data/api/authApi';
import { AuthContext } from '../../context/AuthContext';
import { colors } from '../theme/colors';
import { setDemoMode, loadDemoMode } from '../../data/demo/demoMode';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Recipes') iconName = focused ? 'book' : 'book-outline';
          else if (route.name === 'Ingredients') iconName = focused ? 'basket' : 'basket-outline';
          else if (route.name === 'Sales') iconName = focused ? 'cash' : 'cash-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Sales" component={SalesScreen} options={{ tabBarLabel: 'Vendas' }} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={{ tabBarLabel: 'Receitas' }} />
      <Tab.Screen name="Ingredients" component={IngredientsScreen} options={{ tabBarLabel: 'Ingredientes' }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'app' | 'onboarding'>('loading');
  const [showRegister, setShowRegister] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [demoMode, setDemoModeState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const isDemo = await loadDemoMode();
        const token = await tokenStorage.getToken();
        if (token) {
          const user = await tokenStorage.getUser();
          setCompanyName(user?.companyName || '');
          setDemoModeState(isDemo);
          setAuthState('app');
        } else {
          const seen = await hasSeenOnboarding();
          setAuthState(seen ? 'auth' : 'onboarding');
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
        setAuthState('auth');
      }
    })();
  }, []);

  const logout = async () => {
    await setDemoMode(false);
    setDemoModeState(false);
    await authApi.logout();
    setCompanyName('');
    setAuthState('auth');
  };

  const loginAsDemo = async () => {
    await setDemoMode(true);
    setDemoModeState(true);
    await tokenStorage.saveUser({ id: 'demo', companyName: 'Demo User', email: 'review@demo.local' });
    await tokenStorage.saveToken('demo-token');
    setCompanyName('Demo User');
    setAuthState('app');
  };

  if (authState === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (authState === 'onboarding') {
    return <OnboardingScreen onDone={() => setAuthState('auth')} />;
  }

  if (authState === 'auth') {
    if (showRegister) {
      return (
        <RegisterScreen
          onRegister={() => setAuthState('app')}
          onGoToLogin={() => setShowRegister(false)}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={() => setAuthState('app')}
        onGoToRegister={() => setShowRegister(true)}
        onDemoLogin={loginAsDemo}
      />
    );
  }

  return (
    <AuthContext.Provider value={{ logout, companyName, isDemoMode: demoMode }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="Recipes" component={RecipesScreen} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
          <Stack.Screen name="CreateRecipe" component={CreateRecipeScreen} />
          <Stack.Screen name="EditRecipe" component={CreateRecipeScreen} />
          <Stack.Screen name="Ingredients" component={IngredientsScreen} />
          <Stack.Screen name="CreateIngredient" component={CreateIngredientScreen} />
          <Stack.Screen name="EditIngredient" component={CreateIngredientScreen} />
          <Stack.Screen name="CreateSale" component={CreateSaleScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
