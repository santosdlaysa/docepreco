import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
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
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { OnboardingScreen, hasSeenOnboarding } from '../screens/OnboardingScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { PremiumAdScreen } from '../screens/PremiumAdScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { CreateOrderScreen } from '../screens/CreateOrderScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { CreateClientScreen } from '../screens/CreateClientScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { PdfSettingsScreen } from '../screens/PdfSettingsScreen';
import { IngredientPriceHistoryScreen } from '../screens/IngredientPriceHistoryScreen';
import { SeasonsScreen } from '../screens/SeasonsScreen';
import { CreateSeasonScreen } from '../screens/CreateSeasonScreen';
import { BeginnerGuideScreen } from '../screens/BeginnerGuideScreen';
import { tokenStorage } from '../../data/storage/tokenStorage';
import { companyLogoStorage } from '../../data/storage/companyLogoStorage';
import { authApi } from '../../data/api/authApi';
import { AuthContext } from '../../context/AuthContext';
import { colors } from '../theme/colors';
import { setDemoMode, loadDemoMode } from '../../data/demo/demoMode';
import { identifyRevenueCatUser, logoutRevenueCatUser, setRevenueCatLocationAttributes } from '../../data/premium/revenueCat';
import { registerPushToken } from '../utils/notifications';
import mobileAds from 'react-native-google-mobile-ads';
import { requestAdConsent } from '../ads';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();

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
          paddingBottom: insets.bottom + 4,
          height: 60 + insets.bottom,
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
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'app' | 'onboarding' | 'premiumAd'>('loading');
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogoState] = useState<string | null>(null);
  const [demoMode, setDemoModeState] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const pendingPaywall = useRef(false);

  useEffect(() => {
    mobileAds().initialize().catch(() => {});
    requestAdConsent();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const isDemo = await loadDemoMode();
        const token = await tokenStorage.getToken();
        const savedLogo = await companyLogoStorage.get();
        if (savedLogo) setCompanyLogoState(savedLogo);
        if (token) {
          const user = await tokenStorage.getUser();
          setCompanyName(user?.companyName || '');
          setDemoModeState(isDemo);
          if (!isDemo && user?.id) {
            void identifyRevenueCatUser(user.id);
            void setRevenueCatLocationAttributes();
          }
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

  // Carrega o nome da confeiteira do storage ao entrar no app (login/registro)
  useEffect(() => {
    if (authState === 'app') {
      if (!demoMode) {
        void registerPushToken();
      }
      if (!companyName) {
        tokenStorage.getUser().then(user => {
          if (user?.companyName) {
            setCompanyName(user.companyName);
          }
        });
      }
    }
  }, [authState]);

  const handleSetCompanyLogo = async (logo: string | null) => {
    if (logo) {
      await companyLogoStorage.save(logo);
      const savedPath = await companyLogoStorage.get();
      setCompanyLogoState(savedPath ? `${savedPath}?t=${Date.now()}` : null);
    } else {
      await companyLogoStorage.remove();
      setCompanyLogoState(null);
    }
  };

  const logout = async () => {
    await setDemoMode(false);
    setDemoModeState(false);
    await authApi.logout();
    await logoutRevenueCatUser();
    setCompanyName('');
    setCompanyLogoState(null);
    setAuthState('auth');
  };

  const loginAsDemo = async () => {
    await setDemoMode(true);
    setDemoModeState(true);
    await tokenStorage.saveUser({
      id: 'demo',
      companyName: 'Demo User',
      email: 'review@demo.local',
      isPremium: false,
      premiumUntil: null,
      premiumPlatform: null,
    });
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

  const handleAuthSuccess = async () => {
    const user = await tokenStorage.getUser();
    if (user?.isPremium) {
      setAuthState('app');
    } else {
      setAuthState('premiumAd');
    }
  };

  if (authState === 'auth') {
    if (showForgotPassword) {
      return (
        <ForgotPasswordScreen
          onBack={() => setShowForgotPassword(false)}
        />
      );
    }
    if (showRegister) {
      return (
        <RegisterScreen
          onRegister={() => void handleAuthSuccess()}
          onGoToLogin={() => setShowRegister(false)}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={() => void handleAuthSuccess()}
        onGoToRegister={() => setShowRegister(true)}
        onGoToForgotPassword={() => setShowForgotPassword(true)}
        onDemoLogin={loginAsDemo}
      />
    );
  }

  if (authState === 'premiumAd') {
    return (
      <PremiumAdScreen
        onViewPlans={() => {
          pendingPaywall.current = true;
          setAuthState('app');
        }}
        onSkip={() => setAuthState('app')}
      />
    );
  }

  return (
    <AuthContext.Provider value={{ logout, companyName, isDemoMode: demoMode, companyLogo, setCompanyLogo: handleSetCompanyLogo }}>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          if (pendingPaywall.current) {
            pendingPaywall.current = false;
            navigationRef.current?.navigate('Paywall');
          }
        }}
      >
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
          <Stack.Screen name="Orders" component={OrdersScreen} />
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
          <Stack.Screen name="EditOrder" component={CreateOrderScreen} />
          <Stack.Screen name="Clients" component={ClientsScreen} />
          <Stack.Screen name="CreateClient" component={CreateClientScreen} />
          <Stack.Screen name="EditClient" component={CreateClientScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="PdfSettings" component={PdfSettingsScreen} />
          <Stack.Screen name="IngredientPriceHistory" component={IngredientPriceHistoryScreen} />
          <Stack.Screen name="Seasons" component={SeasonsScreen} />
          <Stack.Screen name="CreateSeason" component={CreateSeasonScreen} />
          <Stack.Screen name="EditSeason" component={CreateSeasonScreen} />
          <Stack.Screen name="BeginnerGuide" component={BeginnerGuideScreen} />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
