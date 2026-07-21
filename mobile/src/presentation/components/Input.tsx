import { colors } from '../theme/colors';
import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { typography } from '../theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  suffix?: string;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  suffix,
  rightElement,
  leftElement,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, !!error && styles.inputWrapperError]}>
        {leftElement}
        <TextInput
          style={[styles.input, !!(suffix || rightElement) && styles.inputWithSuffix]}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inputWrapperError: { borderColor: colors.error },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.body,
    color: colors.text,
  },
  inputWithSuffix: { paddingRight: 8 },
  inputError: { borderColor: colors.error },
  rightElement: { paddingRight: 12 },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
  suffix: {
    paddingRight: 14,
    ...typography.body,
    color: colors.textSecondary,
  },
});
