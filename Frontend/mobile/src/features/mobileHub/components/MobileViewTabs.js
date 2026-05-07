import { Pressable, ScrollView, Text, View } from 'react-native'
import { styles } from '../styles'

export function MobileViewTabs({ views, activeViewId, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrap}>
      <View style={styles.tabsRow}>
        {views.map((view) => (
          <Pressable
            key={view.id}
            onPress={() => onSelect(view.id)}
            style={[styles.tabButton, view.id === activeViewId ? styles.tabButtonActive : null]}
          >
            <Text
              style={[
                styles.tabButtonText,
                view.id === activeViewId ? styles.tabButtonTextActive : null,
              ]}
            >
              {view.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}
