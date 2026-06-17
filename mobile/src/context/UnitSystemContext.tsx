import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UnitSystem = 'metric' | 'imperial';

interface UnitSystemContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (unitSystem: UnitSystem) => Promise<void>;
  loading: boolean;
}

const UNIT_SYSTEM_STORAGE_KEY = '@docepreco_unit_system';
const DEFAULT_UNIT_SYSTEM: UnitSystem = 'metric';

export const UNIT_SYSTEM_INFO: Record<UnitSystem, { name: string; description: string }> = {
  metric: {
    name: 'Métrico',
    description: 'g, kg, ml, L e un',
  },
  imperial: {
    name: 'Americano',
    description: 'oz, lb, fl oz, cup, tbsp, tsp e un',
  },
};

export const UnitSystemContext = createContext<UnitSystemContextType>({
  unitSystem: DEFAULT_UNIT_SYSTEM,
  setUnitSystem: async () => {},
  loading: true,
});

export const UnitSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnitSystem = async () => {
      try {
        const stored = await AsyncStorage.getItem(UNIT_SYSTEM_STORAGE_KEY);
        if (stored && isValidUnitSystem(stored)) {
          setUnitSystemState(stored);
        }
      } catch {
        console.error('Erro ao carregar sistema de unidades');
      } finally {
        setLoading(false);
      }
    };

    loadUnitSystem();
  }, []);

  const setUnitSystem = async (newUnitSystem: UnitSystem) => {
    setUnitSystemState(newUnitSystem);
    try {
      await AsyncStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, newUnitSystem);
    } catch {
      console.error('Erro ao salvar sistema de unidades');
    }
  };

  return (
    <UnitSystemContext.Provider value={{ unitSystem, setUnitSystem, loading }}>
      {children}
    </UnitSystemContext.Provider>
  );
};

export const useUnitSystem = () => useContext(UnitSystemContext);

export const isValidUnitSystem = (value: string): value is UnitSystem => {
  return value === 'metric' || value === 'imperial';
};
