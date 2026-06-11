import React from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhotoModalProps {
  visible: boolean;
  photo: string;
  onClose: () => void;
}

export function PhotoModal({ visible, photo, onClose }: PhotoModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 16 }]}
          onPress={onClose}
          hitSlop={12}
        >
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
        <Image
          source={{ uri: `data:image/jpeg;base64,${photo}` }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  image: {
    width: '90%',
    height: '70%',
    borderRadius: 12,
  },
});
