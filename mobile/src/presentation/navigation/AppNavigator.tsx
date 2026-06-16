import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef, useNavigationState } from '@react-navigation/native';
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
import { ReferralScreen } from '../screens/ReferralScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { OnboardingScreen, hasSeenOnboarding } from '../screens/OnboardingScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { PremiumAdScreen } from '../screens/PremiumAdScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { CreateOrderScreen } from '../screens/CreateOrderScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { CreateClientScreen } from '../screens/CreateClientScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { CreateExpenseScreen } from '../screens/CreateExpenseScreen';
import { StockScreen } from '../screens/StockScreen';
import { SalesTipsScreen } from '../screens/SalesTipsScreen';
import { PdfSettingsScreen } from '../screens/PdfSettingsScreen';
import { IngredientPriceHistoryScreen } from '../screens/IngredientPriceHistoryScreen';
import { SeasonsScreen } from '../screens/SeasonsScreen';
import { CreateSeasonScreen } from '../screens/CreateSeasonScreen';
import { PricingTutorialScreen } from '../screens/PricingTutorialScreen';
import { RecipeTutorialScreen } from '../screens/RecipeTutorialScreen';
import { BeginnerGuideScreen, isGuideAvailable, resetGuide } from '../screens/BeginnerGuideScreen';
import { SupportChatScreen } from '../screens/SupportChatScreen';
import { PixPaymentScreen } from '../screens/PixPaymentScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { AdminUserDetailScreen } from '../screens/admin/AdminUserDetailScreen';
import { AdminPixScreen } from '../screens/admin/AdminPixScreen';
import { AdminSupportScreen } from '../screens/admin/AdminSupportScreen';
import { AdminSupportChatScreen } from '../screens/admin/AdminSupportChatScreen';
import { tokenStorage } from '../../data/storage/tokenStorage';
import { companyLogoStorage } from '../../data/storage/companyLogoStorage';
import { authApi } from '../../data/api/authApi';
import { AuthContext } from '../../context/AuthContext';
import { colors } from '../theme/colors';
import { setDemoMode, loadDemoMode } from '../../data/demo/demoMode';
import { identifyRevenueCatUser, logoutRevenueCatUser, setRevenueCatLocationAttributes } from '../../data/premium/revenueCat';
import { registerPushToken } from '../utils/notifications';
import { requestAdConsent } from '../ads';
import { initializeMobileAds } from '../ads/initMobileAds';
import { usePremium } from '../context/PremiumContext';
import { setForceLogout } from '../../data/api/client';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Placeholder screen for the center "+" tab (never actually rendered)
const DummyScreen = () => null;

const ACTION_MAP: Record<string, { route: keyof RootStackParamList; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  Home:        { route: 'CreateSale',       icon: 'cart',    label: 'Venda' },
  Recipes:     { route: 'CreateRecipe',     icon: 'book',    label: 'Receita' },
  Ingredients: { route: 'CreateIngredient', icon: 'basket',  label: 'Ingrediente' },
  Sales:       { route: 'CreateSale',       icon: 'cart',    label: 'Venda' },
};

// CenterTabButton é renderizado DENTRO do Tab navigator,
// então useNavigationState aqui pega o estado correto do Tab.
function CenterTabButton({ onPress }: { onPress?: (e: any) => void }) {
  const activeTab = useNavigationState(s => s?.routes[s.index]?.name ?? 'Home');
  const action = ACTION_MAP[activeTab];

  return (
    <TouchableOpacity style={tabStyles.centerBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={tabStyles.centerBtnInner}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
      {action && (
        <Text style={tabStyles.centerLabel}>{action.label}</Text>
      )}
    </TouchableOpacity>
  );
}

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
          else if (route.name === 'Sales') iconName = focused ? 'cart' : 'cart-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + 4,
          height: 64 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={{ tabBarLabel: 'Receitas' }} />
      <Tab.Screen
        name="AddAction"
        component={DummyScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <CenterTabButton onPress={props.onPress} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // Usa getState() para ler o tab ativo no momento do toque
            const state = navigation.getState();
            const currentTab = state?.routes[state.index]?.name ?? 'Home';
            const destination = ACTION_MAP[currentTab]?.route ?? 'CreateSale';
            navigation.navigate(destination);
          },
        })}
      />
      <Tab.Screen name="Ingredients" component={IngredientsScreen} options={{ tabBarLabel: 'Ingredientes' }} />
      <Tab.Screen name="Sales" component={SalesScreen} options={{ tabBarLabel: 'Vendas' }} />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  centerBtn: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  centerBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
});

export function AppNavigator() {
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'app' | 'onboarding' | 'premiumAd' | 'beginnerGuide'>('loading');
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogoState] = useState<string | null>(null);
  const [demoMode, setDemoModeState] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const pendingPaywall = useRef(false);
  const { reset: resetPremium, refresh: refreshPremium } = usePremium();

  useEffect(() => {
    initializeMobileAds();
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
    resetPremium();
    setCompanyName('');
    setCompanyLogoState(null);
    setAuthState('auth');
  };

  useEffect(() => { setForceLogout(logout); }, []);

  const deleteAccount = async () => {
    await authApi.deleteAccount();
    await setDemoMode(false);
    setDemoModeState(false);
    await logoutRevenueCatUser();
    resetPremium();
    setCompanyName('');
    setCompanyLogoState(null);
    await companyLogoStorage.remove();
    setAuthState('auth');
  };

  const goToRegister = async () => {
    await setDemoMode(false);
    setDemoModeState(false);
    await authApi.logout();
    await logoutRevenueCatUser();
    resetPremium();
    setCompanyName('');
    setCompanyLogoState(null);
    setShowRegister(true);
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
    await refreshPremium();
    const user = await tokenStorage.getUser();
    if (user?.isPremium) {
      setAuthState('app');
    } else {
      setAuthState('premiumAd');
    }
  };

  const handleRegisterSuccess = async () => {
    await refreshPremium();
    await resetGuide();
    setAuthState('beginnerGuide');
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
          onRegister={() => void handleRegisterSuccess()}
          onGoToLogin={() => setShowRegister(false)}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={() => handleAuthSuccess()}
        onGoToRegister={() => setShowRegister(true)}
        onGoToForgotPassword={() => setShowForgotPassword(true)}
      />
    );
  }

  if (authState === 'beginnerGuide') {
    return (
      <AuthContext.Provider value={{ logout, deleteAccount, goToRegister, companyName, isDemoMode: demoMode, companyLogo, setCompanyLogo: handleSetCompanyLogo }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="BeginnerGuide">
              {() => (
                <BeginnerGuideScreen onComplete={() => {
                  AsyncStorage.setItem('@docepreco_beginner_guide_dismissed', 'true').catch(() => {});
                  setAuthState('app');
                }} />
              )}
            </Stack.Screen>
            <Stack.Screen name="CreateIngredient" component={CreateIngredientScreen} />
            <Stack.Screen name="CreateRecipe" component={CreateRecipeScreen} />
            <Stack.Screen name="Recipes" component={RecipesScreen} />
            <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthContext.Provider>
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
    <AuthContext.Provider value={{ logout, deleteAccount, goToRegister, companyName, isDemoMode: demoMode, companyLogo, setCompanyLogo: handleSetCompanyLogo }}>
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
          <Stack.Screen name="Referral" component={ReferralScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="Orders" component={OrdersScreen} />
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
          <Stack.Screen name="EditOrder" component={CreateOrderScreen} />
          <Stack.Screen name="Clients" component={ClientsScreen} />
          <Stack.Screen name="CreateClient" component={CreateClientScreen} />
          <Stack.Screen name="EditClient" component={CreateClientScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Finance" component={FinanceScreen} />
          <Stack.Screen name="Expenses" component={ExpensesScreen} />
          <Stack.Screen name="CreateExpense" component={CreateExpenseScreen} />
          <Stack.Screen name="Stock" component={StockScreen} />
          <Stack.Screen name="SalesTips" component={SalesTipsScreen} />
          <Stack.Screen name="PdfSettings" component={PdfSettingsScreen} />
          <Stack.Screen name="IngredientPriceHistory" component={IngredientPriceHistoryScreen} />
          <Stack.Screen name="PricingTutorial" component={PricingTutorialScreen} />
          <Stack.Screen name="RecipeTutorial" component={RecipeTutorialScreen} />
          <Stack.Screen name="Seasons" component={SeasonsScreen} />
          <Stack.Screen name="CreateSeason" component={CreateSeasonScreen} />
          <Stack.Screen name="EditSeason" component={CreateSeasonScreen} />
          <Stack.Screen name="BeginnerGuide" component={BeginnerGuideScreen} />
          <Stack.Screen name="SupportChat" component={SupportChatScreen} />
          <Stack.Screen name="AdminDashboard">
            {({ navigation: nav }) => (
              <AdminDashboardScreen
                onLogout={() => nav.popToTop()}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
          <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} />
          <Stack.Screen name="AdminPix" component={AdminPixScreen} />
          <Stack.Screen name="AdminSupport" component={AdminSupportScreen} />
          <Stack.Screen name="AdminSupportChat" component={AdminSupportChatScreen} />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="PixPayment"
            component={PixPaymentScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
