/**
 * Achievement Service
 * Generates verified achievements, milestone progress, and contribution badges
 * strictly from real verified data without dummy/fake entries.
 */

/**
 * Calculate earned achievements for a player
 * @param {object} params
 * @param {object} params.player
 * @param {object} params.singles
 * @param {object} params.doubles
 * @param {object} params.streak
 * @returns {Array<object>}
 */
function calculateAchievements({ player, singles, doubles, streak }) {
  const achievements = [];

  const totalMatches = (singles.matches || 0) + (doubles.matches || 0);
  const totalWins = (singles.wins || 0) + (doubles.wins || 0);

  // 1. Competitive Streak Achievements
  const maxActiveStreak = Math.max(streak?.singles?.current || 0, streak?.doubles?.current || 0);
  const historicMaxStreak = Math.max(streak?.singles?.max || 0, streak?.doubles?.max || 0);

  if (maxActiveStreak >= 5) {
    achievements.push({
      id: 'streak_dominating',
      name: 'Bất Khả Chiến Bại',
      description: `Đang có chuỗi ${maxActiveStreak} trận thắng liên tiếp rực lửa`,
      icon: 'Flame',
      tier: 'diamond',
      category: 'competitive'
    });
  } else if (maxActiveStreak >= 3) {
    achievements.push({
      id: 'streak_on_fire',
      name: 'Đang Lên Tay',
      description: `Đang giữ chuỗi ${maxActiveStreak} trận toàn thắng`,
      icon: 'Flame',
      tier: 'gold',
      category: 'competitive'
    });
  } else if (historicMaxStreak >= 5) {
    achievements.push({
      id: 'historic_streak',
      name: 'Kỷ Lục Chuỗi Thắng',
      description: `Từng lập chuỗi ${historicMaxStreak} trận thắng liên tiếp`,
      icon: 'Flame',
      tier: 'silver',
      category: 'competitive'
    });
  }

  // 2. Match Count Milestones (Veteran)
  if (totalMatches >= 50) {
    achievements.push({
      id: 'legend_50',
      name: 'Huyền Thoại Sân Cầu',
      description: `Đã thi đấu hơn 50 trận đấu chính thức (${totalMatches} trận)`,
      icon: 'Crown',
      tier: 'challenger',
      category: 'competitive'
    });
  } else if (totalMatches >= 20) {
    achievements.push({
      id: 'veteran_20',
      name: 'Chiến Binh Dày Dạn',
      description: `Đã cán mốc ${totalMatches} trận đấu cọ xát`,
      icon: 'Swords',
      tier: 'gold',
      category: 'competitive'
    });
  } else if (totalMatches >= 10) {
    achievements.push({
      id: 'fighter_10',
      name: 'Tay Vợt Cần Mẫn',
      description: `Đã hoàn thành ${totalMatches} trận đấu`,
      icon: 'Swords',
      tier: 'silver',
      category: 'competitive'
    });
  }

  // 3. Win Rate Achievements (Requires at least 5 matches to avoid 1-match anomalies)
  if (singles.matches >= 5 && singles.winRate >= 60) {
    achievements.push({
      id: 'deadly_singles',
      name: 'Sát Thủ Đơn',
      description: `Tỷ lệ thắng Đơn ấn tượng ${singles.winRate.toFixed(1)}% (${singles.matches} trận)`,
      icon: 'Target',
      tier: singles.winRate >= 75 ? 'diamond' : 'gold',
      category: 'competitive'
    });
  }

  if (doubles.matches >= 5 && doubles.winRate >= 60) {
    achievements.push({
      id: 'deadly_doubles',
      name: 'Song Đấu Ăn Ý',
      description: `Tỷ lệ thắng Đôi vượt trội ${doubles.winRate.toFixed(1)}% (${doubles.matches} trận)`,
      icon: 'Users',
      tier: doubles.winRate >= 75 ? 'diamond' : 'gold',
      category: 'competitive'
    });
  }

  // 4. Elo Tier Milestones
  const topTier = [singles.tier, doubles.tier].includes('Challenger') ? 'Challenger'
    : [singles.tier, doubles.tier].includes('Diamond') ? 'Diamond'
    : [singles.tier, doubles.tier].includes('Platinum') ? 'Platinum'
    : [singles.tier, doubles.tier].includes('Gold') ? 'Gold'
    : null;

  if (topTier) {
    achievements.push({
      id: `rank_${topTier.toLowerCase()}`,
      name: `Đẳng Cấp ${topTier}`,
      description: `Đạt mức phân hạng ${topTier} danh giá`,
      icon: 'Trophy',
      tier: topTier.toLowerCase(),
      category: 'competitive'
    });
  }

  // 5. Club Contribution Badges (from users.soft_skills)
  let skills = [];
  if (player.soft_skills) {
    try {
      skills = typeof player.soft_skills === 'string'
        ? JSON.parse(player.soft_skills)
        : player.soft_skills;
    } catch (e) {
      skills = Array.isArray(player.soft_skills) ? player.soft_skills : [];
    }
  }

  if (Array.isArray(skills)) {
    skills.forEach(skill => {
      const s = skill.toLowerCase();
      if (s.includes('chụp') || s.includes('ảnh') || s.includes('media') || s.includes('quay')) {
        achievements.push({
          id: 'contrib_media',
          name: 'Nhiếp Ảnh Gia',
          description: 'Đóng góp hình ảnh & truyền thông cho CLB',
          icon: 'Camera',
          tier: 'platinum',
          category: 'contribution'
        });
      } else if (s.includes('thiết kế') || s.includes('design') || s.includes('cọ') || s.includes('vẽ')) {
        achievements.push({
          id: 'contrib_design',
          name: 'Nhà Thiết Kế',
          description: 'Sáng tạo ấn phẩm hình ảnh cho CLB',
          icon: 'Paintbrush',
          tier: 'platinum',
          category: 'contribution'
        });
      } else if (s.includes('tổ chức') || s.includes('sự kiện') || s.includes('event')) {
        achievements.push({
          id: 'contrib_event',
          name: 'Tổ Chức Sự Kiện',
          description: 'Góp sức điều phối các giải đấu và hoạt động CLB',
          icon: 'Calendar',
          tier: 'gold',
          category: 'contribution'
        });
      } else if (s.includes('code') || s.includes('lập trình') || s.includes('dev') || s.includes('web')) {
        achievements.push({
          id: 'contrib_dev',
          name: 'Lập Trình Viên',
          description: 'Đóng góp phát triển nền tảng công nghệ CLB',
          icon: 'Code',
          tier: 'diamond',
          category: 'contribution'
        });
      }
    });
  }

  return achievements;
}

/**
 * Calculate next milestones to give player clear, motivational goals
 */
function calculateMilestones({ singles, doubles, progression }) {
  const milestones = [];
  const totalMatches = (singles.matches || 0) + (doubles.matches || 0);

  // 1. Next Tier Milestone
  if (progression && progression.hasNextTier && progression.eloNeeded > 0) {
    milestones.push({
      type: 'elo',
      title: `+${progression.eloNeeded} ELO LÊN ${progression.nextTierName.toUpperCase()}`,
      description: `Cần thêm ${progression.eloNeeded} ELO để thăng hạng ${progression.nextTierLabel}`,
      progressPercent: progression.progressPercent,
      target: progression.nextTierMinElo,
      current: progression.currentElo
    });
  }

  // 2. Veteran Milestone
  if (totalMatches < 20) {
    const remaining = 20 - totalMatches;
    milestones.push({
      type: 'veteran',
      title: `${remaining} TRẬN NỮA ĐỂ ĐẠT CHIẾN BINH`,
      description: `Đấu thêm ${remaining} trận để mở khóa huy hiệu Chiến Binh Dày Dạn (20 trận)`,
      progressPercent: Math.round((totalMatches / 20) * 100),
      target: 20,
      current: totalMatches
    });
  } else if (totalMatches < 50) {
    const remaining = 50 - totalMatches;
    milestones.push({
      type: 'legend',
      title: `${remaining} TRẬN ĐẾN HUYỀN THOẠI`,
      description: `Đấu thêm ${remaining} trận để ghi danh vào câu lạc bộ 50 trận`,
      progressPercent: Math.round((totalMatches / 50) * 100),
      target: 50,
      current: totalMatches
    });
  }

  return milestones;
}

module.exports = {
  calculateAchievements,
  calculateMilestones
};
