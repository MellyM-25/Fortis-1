// src/screens/main/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../../components/common/Card';
import { colors } from '../../utils/colors';
import { typography } from '../../utils/typography';
import { spacing } from '../../utils/spacing';
import { useApp } from '../../context/AppContext';
import { ProgressChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { userProfile, workouts, personalRecords, reloadData, needsReload, setNeedsReload } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [motivationalQuote, setMotivationalQuote] = useState('');

  const motivationalQuotes = [
    "The only bad workout is the one that didn't happen.",
    "Push harder than yesterday if you want a different tomorrow.",
    "Success starts with self-discipline.",
    "Your body can stand almost anything. It's your mind you have to convince.",
    "Don't stop when you're tired. Stop when you're done.",
  ];
  /**
  * Statistics state object
  * Comprehensive workout analytics including weekly metrics,
  * progress tracking, and performance indicators
  */
  const [stats, setStats] = useState({
    weeklyWorkouts: 0,
    currentStreak: 0,
    totalVolume: 0,
    lastWorkout: null,
    weeklyGoal: 4,
    weeklyProgress: 0,
    todayWorkout: false,
    weeklyAverageIntensity: 0,
    weeklyCompletionRate: 100,
  });

  useEffect(() => {
    calculateStats();
    setTimeBasedGreeting();
    setRandomQuote();
  }, [workouts]);

  /**
   * Focus Effect: Data Synchronization
   * Implements conditional data reloading when screen gains focus
   * Ensures dashboard displays most current information after navigation
   */
  useFocusEffect(
    React.useCallback(() => {
      const reloadIfNeeded = async () => {
        if (needsReload) {
          await reloadData();
          setNeedsReload(false);
        }
      };
      reloadIfNeeded();
    }, [needsReload])
  );
  // Time-Based Greeting Generator
  const setTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 17) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  };

  // Random Quote Selection Algorithm
  const setRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setMotivationalQuote(motivationalQuotes[randomIndex]);
  };
  /**
   * Comprehensive Statistics Calculation
   * Primary algorithm for processing workout data into meaningful metrics
   * Implements multiple statistical calculations and data transformations
   */
  const calculateStats = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyWorkouts = workouts.filter(w =>
      new Date(w.date) >= oneWeekAgo
    );
    // Calculate average workout intensity 
    const weeklyAverageIntensity = weeklyWorkouts.reduce((sum, w) =>
      sum + (w.average_intensity || 3), 0) / (weeklyWorkouts.length || 1);
    // Calculate average completion rate 
    const weeklyCompletionRate = weeklyWorkouts.reduce((sum, w) =>
      sum + (w.completion_percentage ?? 0), 0) / (weeklyWorkouts.length || 1);
    /**
     * Current Streak Calculation Algorithm
     * Implements consecutive day workout tracking with gap detection
     *
     * Algorithm Logic:
     * 1. Sort workouts by date (descending)
     * 2. Check if workout exists for current day
     * 3. Iterate backwards from today/yesterday checking for consecutive workouts
     * 4. Break on first gap detected
     *
     * @returns {currentStreak} Current consecutive workout streak
     */
    const calculateCurrentStreak = () => {
      if (workouts.length === 0) return 0;

      const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
      let currentStreak = 0;
      let checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);

      const todayWorkout = workouts.some(w => {
        const workoutDate = new Date(w.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.getTime() === checkDate.getTime();
      });

      // Start from yesterday if no workout today
      if (!todayWorkout) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      for (const workout of sortedWorkouts) {
        const workoutDate = new Date(workout.date);
        workoutDate.setHours(0, 0, 0, 0);

        if (workoutDate.getTime() === checkDate.getTime()) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (workoutDate.getTime() < checkDate.getTime()) {
          break; // Gap found
        }
      }

      return currentStreak;
    };

    const streak = calculateCurrentStreak();
    // Today's workout verification using date string comparison
    const today = new Date();
    const todayWorkout = workouts.some(w => {
      const workoutDate = new Date(w.date);
      return workoutDate.toDateString() === today.toDateString();
    });
    // Calculate total weekly volume with multiple property fallbacks
    const weeklyVolume = weeklyWorkouts.reduce((sum, w) => {
      return sum + (w.total_volume || w.totalVolume || 0);
    }, 0);
    // Identify most recent workout for "last workout" display
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastWorkout = sortedWorkouts[0] || null;
    // Update statistics state with calculated values
    setStats({
      weeklyWorkouts: weeklyWorkouts.length,
      currentStreak: streak,
      totalVolume: weeklyVolume,
      lastWorkout,
      weeklyGoal: 4,
      weeklyProgress: (weeklyWorkouts.length / 4) * 100,
      todayWorkout,
      weeklyAverageIntensity: Math.round(weeklyAverageIntensity),
      weeklyCompletionRate: Math.round(weeklyCompletionRate),
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reloadData();
    setRandomQuote();
    setRefreshing(false);
  };

  const startNewSession = () => {
    navigation.navigate('Workouts');
  };

  const getProgressData = () => {
    return {
      data: [Math.min(stats.weeklyProgress / 100, 1)],
    };
  };

  const QuickAction = ({ icon, title, color, onPress, badge }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <LinearGradient
        colors={[color + '20', color + '10']}
        style={styles.quickActionGradient}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="#FFFFFF" />
        </View>
        <Text style={styles.quickActionTitle}>{title}</Text>
        {badge !== undefined && badge !== null && badge > 0 && (
          <View style={styles.quickActionBadge}>
            <Text style={styles.quickActionBadgeText}>{badge}</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.username}>{userProfile?.username || 'Athlete'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
              <LinearGradient
                colors={colors.gradientPrimary}
                style={styles.profileGradient}
              >
                <Text style={styles.profileInitial}>
                  {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Motivational Quote */}
        <Card style={styles.quoteCard}>
          <LinearGradient
            colors={['rgba(255, 71, 87, 0.1)', 'rgba(99, 102, 241, 0.1)']}
            style={styles.quoteGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="flash" size={20} color={colors.primary} />
            <Text style={styles.quoteText}>{motivationalQuote}</Text>
          </LinearGradient>
        </Card>

        {/* Today's Focus */}
        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Today</Text>
          <Card style={styles.todayCard}>
            {stats.todayWorkout ? (
              <View style={styles.todayComplete}>
                <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                <Text style={styles.todayCompleteText}>Workout Complete! 🎉</Text>
                <Text style={styles.todayCompleteSubtext}>Great job staying consistent!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.todayText}>Ready for your workout?</Text>
                <TouchableOpacity style={styles.startTodayButton} onPress={startNewSession}>
                  <LinearGradient
                    colors={colors.gradientPrimary}
                    style={styles.startTodayGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                    <Text style={styles.startTodayText}>Start Today's Workout</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </Card>
        </View>

        {/* This Week Progress */}
        <View style={styles.weekSection}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <Card style={styles.weeklyProgressCard}>
            <View style={styles.weeklyProgressContent}>
              <View style={styles.weeklyLeft}>
                <ProgressChart
                  data={getProgressData()}
                  width={80}
                  height={80}
                  strokeWidth={8}
                  radius={32}
                  chartConfig={{
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    color: (opacity = 1) => `rgba(255, 71, 87, ${opacity})`,
                  }}
                  hideLegend={true}
                />
                <View style={styles.progressCenter}>
                  <Text style={styles.progressPercentage}>
                    {Math.round(stats.weeklyProgress)}%
                  </Text>
                </View>
              </View>
              <View style={styles.weeklyRight}>
                <View style={styles.weeklyStat}>
                  <Text style={styles.weeklyStatValue}>{stats.weeklyWorkouts}/{stats.weeklyGoal}</Text>
                  <Text style={styles.weeklyStatLabel}>Workouts</Text>
                </View>
                <View style={styles.weeklyStat}>
                  <View style={styles.streakContainer}>
                    <Text style={styles.weeklyStatValue}>{stats.currentStreak}</Text>
                    {stats.currentStreak > 0 && <Text style={styles.fireEmoji}>🔥</Text>}
                  </View>
                  <Text style={styles.weeklyStatLabel}>Day Streak</Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="barbell"
              title="Start Workout"
              color={colors.primary}
              onPress={startNewSession}
            />
            <QuickAction
              icon="trophy"
              title="Personal Records"
              color={colors.warning}
              onPress={() => navigation.navigate('PersonalRecords')}
            />
            <QuickAction
              icon="analytics"
              title="Progress"
              color={colors.info}
              onPress={() => navigation.navigate('Progress')}
            />
            <QuickAction
              icon="calendar"
              title="Workout History"
              color={colors.success}
              onPress={() => navigation.navigate('WorkoutHistory')}
            />
          </View>
        </View>

        {/* Your Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <LinearGradient
                colors={['rgba(255, 71, 87, 0.1)', 'rgba(255, 71, 87, 0.05)']}
                style={styles.statGradient}
              >
                <Ionicons name="barbell" size={24} color={colors.primary} />
                <Text style={styles.statValue}>{workouts.length}</Text>
                <Text style={styles.statLabel}>Total Workouts</Text>
              </LinearGradient>
            </Card>

            <Card style={styles.statCard}>
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.1)', 'rgba(99, 102, 241, 0.05)']}
                style={styles.statGradient}
              >
                <Ionicons name="trending-up" size={24} color={colors.info} />
                <Text style={styles.statValue}>
                  {stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume}
                </Text>
                <Text style={styles.statLabel}>Weekly Volume</Text>
              </LinearGradient>
            </Card>

            <Card style={styles.statCard}>
              <LinearGradient
                colors={['rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 0.05)']}
                style={styles.statGradient}
              >
                <Ionicons name="analytics" size={24} color={colors.success} />
                <Text style={styles.statValue}>{stats.weeklyAverageIntensity || 0}/5</Text>
                <Text style={styles.statLabel}>Avg Intensity</Text>
              </LinearGradient>
            </Card>

            <Card style={styles.statCard}>
              <LinearGradient
                colors={['rgba(168, 85, 247, 0.1)', 'rgba(168, 85, 247, 0.05)']}
                style={styles.statGradient}
              >
                <Ionicons name="checkmark-circle" size={24} color="#a855f7" />
                <Text style={styles.statValue}>
                  {stats.weeklyWorkouts === 0 ? '0%' : `${stats.weeklyCompletionRate}%`}
                </Text>
                <Text style={styles.statLabel}>Completion</Text>
              </LinearGradient>
            </Card>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  username: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  profileGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  quoteCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  quoteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  quoteText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flex: 1,
    fontStyle: 'italic',
  },
  todaySection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  todayCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.xl,
  },
  todayComplete: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  todayCompleteText: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  todayCompleteSubtext: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  todayText: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  startTodayButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startTodayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  startTodayText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  weekSection: {
    marginBottom: spacing.xl,
  },
  weeklyProgressCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
  },
  weeklyProgressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyLeft: {
    position: 'relative',
    marginRight: spacing.xl,
  },
  progressCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: 'bold',
  },
  weeklyRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weeklyStat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  weeklyStatValue: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  weeklyStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fireEmoji: {
    fontSize: 16,
  },
  quickActionsSection: {
    marginBottom: spacing.xl,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  quickAction: {
    width: (width - spacing.xl * 2 - spacing.md * 3) / 4,
    aspectRatio: 1,
  },
  quickActionGradient: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  quickActionBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  quickActionBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 10,
  },
  statsSection: {
    marginBottom: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  statCard: {
    width: '48%',
    overflow: 'hidden',
  },
  statGradient: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default DashboardScreen;