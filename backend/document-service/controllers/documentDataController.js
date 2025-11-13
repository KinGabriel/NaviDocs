import SubmissionBin from '../models/submissionBinModel.js';

export const dashboardDeptHead = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? String(req.user.id) : null;
    if (!userId)
      return res.status(400).json({ success: false, message: 'Missing user id' });

    const userDepartment = req.user?.department || req.user?.dept || null;
    const userSchool = req.user?.school || null;
    const limit = parseInt(req.query.limit, 10) || 200;

    const baseFilter = { status: { $ne: 'archived' } };
    const ownerFilter = { ...baseFilter, created_by: userId };

    let deptFilter = null;
    if (userDepartment || userSchool) {
      const or = [];
      if (userDepartment) or.push({ department: userDepartment });
      if (userSchool) or.push({ school: userSchool });
      deptFilter = { ...baseFilter, $or: or };
    }

    //  Fixed baseProject computation
    const baseProject = {
      title: 1,
      department: 1,
      school: 1,
      created_by: 1,
      is_forwarded: 1,
      forwarded_at: 1,
      createdAt: 1,
      updatedAt: 1,
      deadline: 1,

      submissionsCount: { $size: { $ifNull: ['$submissions', []] } },

      documentsCount: {
        $reduce: {
          input: { $ifNull: ['$submissions', []] },
          initialValue: 0,
          in: { $add: ['$$value', { $size: { $ifNull: ['$$this.documents', []] } }] }
        }
      },

      //  Total submissions considered "submitted" (either submitted_at present or status indicates submitted)
      submittedCount: {
        $size: {
          $filter: {
            input: { $ifNull: ['$submissions', []] },
            as: 's',
            cond: {
              $or: [
                { $ne: [{ $ifNull: ['$$s.submitted_at', null] }, null] },
                { $in: ['$$s.status', ['submitted', 'approved']] }
              ]
            }
          }
        }
      },

      //  On-time = only submissions with a timestamp submitted_at that is <= bin.deadline
      onTimeCount: {
        $size: {
          $filter: {
            input: { $ifNull: ['$submissions', []] },
            as: 's',
            cond: {
              $and: [
                { $ne: [{ $ifNull: ['$$s.submitted_at', null] }, null] },
                { $lte: [{ $ifNull: ['$$s.submitted_at', null] }, '$deadline'] }
              ]
            }
          }
        }
      },

      //  Late = submitted by timestamp after deadline
      lateCount: {
        $size: {
          $filter: {
            input: { $ifNull: ['$submissions', []] },
            as: 's',
            cond: {
              $and: [
                { $ne: [{ $ifNull: ['$$s.submitted_at', null] }, null] },
                { $gt: [{ $ifNull: ['$$s.submitted_at', null] }, '$deadline'] }
              ]
            }
          }
        }
      },

      //  Pending = submissions that are not submitted (no submitted_at) OR have explicit pending statuses
      pendingCount: {
        $size: {
          $filter: {
            input: { $ifNull: ['$submissions', []] },
            as: 's',
            cond: {
              $or: [
                { $eq: [{ $ifNull: ['$$s.submitted_at', null] }, null] },
                { $in: ['$$s.status', ['assigned', 'returned', 'pending']] }
              ]
            }
          }
        }
      },

      //  Compute completion percentage based on actual submitted vs pending
      //  - If there are no submissions -> '—'
      //  - Otherwise compute: completed = onTimeSubs + lateSubs; pending = pendingSubs
      //    completion = floor(completed / (completed + pending) * 100) + '%'
      //  - If (completed + pending) == 0 -> '—'
      completionPercent: {
        $let: {
          vars: {
            onTimeSubs: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$submissions', []] },
                  as: 's',
                  cond: {
                    $and: [
                      { $ne: [{ $ifNull: ['$$s.submitted_at', null] }, null] },
                      { $lte: [{ $ifNull: ['$$s.submitted_at', null] }, '$deadline'] }
                    ]
                  }
                }
              }
            },
            lateSubs: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$submissions', []] },
                  as: 's',
                  cond: {
                    $and: [
                      { $ne: [{ $ifNull: ['$$s.submitted_at', null] }, null] },
                      { $gt: [{ $ifNull: ['$$s.submitted_at', null] }, '$deadline'] }
                    ]
                  }
                }
              }
            },
            pendingSubs: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$submissions', []] },
                  as: 's',
                  cond: {
                    $or: [
                      { $eq: [{ $ifNull: ['$$s.submitted_at', null] }, null] },
                      { $in: ['$$s.status', ['assigned', 'returned', 'pending']] }
                    ]
                  }
                }
              }
            }
          },
          in: {
            $let: {
              vars: {
                completed: { $add: ['$$onTimeSubs', '$$lateSubs'] },
                denom: { $add: ['$$onTimeSubs', '$$lateSubs', '$$pendingSubs'] }
              },
              in: {
                $cond: [
                  { $eq: ['$$denom', 0] },
                  '—',
                  {
                    $concat: [
                      { $toString: { $floor: { $multiply: [ { $divide: ['$$completed', '$$denom'] }, 100 ] } } },
                      '%'
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    };

    // --- AGGREGATION EXECUTION ---
    const ownerAgg = [
      { $match: ownerFilter },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      { $project: baseProject }
    ];

    const deptAgg = deptFilter
      ? [
          { $match: deptFilter },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          { $project: baseProject }
        ]
      : [];

    const [ownerBins = [], deptBins = []] = await Promise.all([
      SubmissionBin.aggregate(ownerAgg).allowDiskUse(true),
      deptAgg.length
        ? SubmissionBin.aggregate(deptAgg).allowDiskUse(true)
        : Promise.resolve([])
    ]);

    // --- Merging owner + dept bins ---
    const mapBin = (b) => ({
      id: b._id,
      title: b.title,
      department: b.department,
      school: b.school,
      created_by: b.created_by,
      is_forwarded: b.is_forwarded,
      forwarded_at: b.forwarded_at,
      // include deadline and status so downstream deadline logic can run
      deadline: b.deadline || null,
      status: b.status || null,
      is_completed: b.is_completed ?? b.completed ?? false,
      submissionsCount: b.submissionsCount ?? 0,
      documentsCount: b.documentsCount ?? 0,
      submittedCount: b.submittedCount ?? 0,
      onTimeCount: b.onTimeCount ?? 0,
      lateCount: b.lateCount ?? 0,
      pendingCount: b.pendingCount ?? 0, 
      completion: b.completionPercent ?? '—',
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    });

    const ownerIds = new Set(ownerBins.map((b) => String(b._id)));
    const merged = [
      ...ownerBins.map(mapBin),
      ...deptBins.filter((b) => !ownerIds.has(String(b._id))).map(mapBin)
    ];
    // deptMapped: mapped bins coming from department-level aggregation (used for deadline categorization)
    const deptMapped = deptBins.map(mapBin);
    console.log('dashboardDeptHead', { merged, deptMappedCount: deptMapped.length });

    // --- Deadline categorization ---
    // upcoming: deadlines from now up to +5 days
    // dueToday: deadlines that fall within today
    // overdue: deadlines in the past up to -5 days
    const now = new Date();
    const msDay = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + msDay - 1);
    const plus5 = new Date(now.getTime() + 5 * msDay);
    const minus5 = new Date(now.getTime() - 5 * msDay);

    const isCompletedBin = (b) => {
      // flexible checks: allow either explicit status or boolean flag
      if (b == null) return false;
      if (typeof b.is_completed === 'boolean') return b.is_completed === true;
      if (typeof b.status === 'string') return b.status.toLowerCase() === 'completed';
      return false;
    };

    const upcomingBins = [];
    const dueTodayBins = [];
    const overdueBins = [];

    // Use date-only comparisons to avoid timezone issues. Convert deadlines to local date (year,month,day)
    const startOfTodayDate = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate()).getTime();
    const plus5Date = new Date(startOfToday.getTime() + 5 * msDay).getTime();
    const minus5Date = new Date(startOfToday.getTime() - 5 * msDay).getTime();

    // categorize only department-level bins as requested
    deptMapped.forEach((b) => {
      if (!b) return; // skip null
      const raw = b.deadline || b.createdAt || null;
      if (!raw) return; // skip bins without any date to evaluate
      if (isCompletedBin(b)) return; // skip completed

      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      // dueToday: same calendar date as today
      if (dDate === startOfTodayDate) {
        dueTodayBins.push(b);
        return;
      }

      // upcoming: date after today up to +5 days
      if (dDate > startOfTodayDate && dDate <= plus5Date) {
        upcomingBins.push(b);
        return;
      }

      // overdue: date before today but not older than 5 days
      if (dDate < startOfTodayDate && dDate >= minus5Date) {
        overdueBins.push(b);
        return;
      }
    });

    // sort by deadline ascending (soonest first)
    const sortByDeadlineAsc = (arr) => arr.sort((x, y) => new Date(x.deadline || x.createdAt) - new Date(y.deadline || y.createdAt));
    sortByDeadlineAsc(upcomingBins);
    sortByDeadlineAsc(dueTodayBins);
    sortByDeadlineAsc(overdueBins);

    console.log('dashboardDeptHead deadlines', { upcomingBins: upcomingBins.length, dueTodayBins: dueTodayBins.length, overdueBins: overdueBins.length });
    return res.json({
      success: true,
      ownerCount: ownerBins.length,
      deptCount: deptBins.length,
      totalReturned: merged.length,
      bins: merged,
      upcoming: upcomingBins,
      dueToday: dueTodayBins,
      overdue: overdueBins
    });
  } catch (err) {
    console.error('dashboardDeptHead error', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error', error: err.message });
  }
};
