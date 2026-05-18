import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIMARY_COLOR } from '../../constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 20 
      }}>
        <Text style={{ 
          fontSize: 24, 
          fontWeight: 'bold', 
          color: PRIMARY_COLOR,
          marginBottom: 10 
        }}>
          Welcome to Player
        </Text>
        <Text style={{ 
          fontSize: 16, 
          color: '#666',
          textAlign: 'center' 
        }}>
          Home Screen - Layout Structure Ready!
        </Text>
      </View>
    </SafeAreaView>
  );
}