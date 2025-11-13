import SubmissionBin from '../models/submissionBinModel.js';
import mongoose from 'mongoose';

/**
 * @desc Returns department-head dashboard aggregates for the current user.
 *       Performs owner + department aggregations and returns merged submission
 *       "bins" together with department-level deadline summaries.
 * @route GET /api/documents/dashboard-dept-head
 * @access Private (Department Head)
 *
 * @returns {Promise<import('express').Response>} JSON response
 */
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


/**
 * @desc
 * @route  
 */

export const dashboardFaculty = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? String(req.user.id) : null;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing user id' });

  const userObjId = new mongoose.Types.ObjectId(userId);

    // Find bins that include a submission for this faculty user
    const agg = [
      { $match: { status: { $ne: 'archived' }, 'submissions.faculty': userObjId } },
      { $unwind: { path: '$submissions' } },
      { $match: { 'submissions.faculty': userObjId } },
      { $project: {
        binId: '$_id',
        binTitle: '$title',
        deadline: '$deadline',
        department: '$department',
        school: '$school',
        submissionId: '$submissions._id',
        status: '$submissions.status',
        submittedAt: '$submissions.submitted_at',
        documents: { $ifNull: ['$submissions.documents', []] },
        templateId: '$submissions.template',
        binCreatedAt: '$createdAt'
      } },
      { $sort: { submittedAt: -1, binCreatedAt: -1 } },
      { $limit: 100 },
      { $lookup: {
        from: 'documents',
        localField: 'documents',
        foreignField: '_id',
        as: 'documentsInfo'
      } }
    ];

    const rows = await SubmissionBin.aggregate(agg).allowDiskUse(true);

    // Map documents and compute simple counts for the faculty dashboard
    const submissions = (rows || []).map((r) => ({
      binId: r.binId,
      binTitle: r.binTitle,
      templateId: r.templateId,
      submissionId: r.submissionId,
      status: r.status || null,
      submittedAt: r.submittedAt || null,
      deadline: r.deadline || null,
      department: r.department || null,
      school: r.school || null,
      documents: (r.documentsInfo || []).map((d) => ({ id: d._id, title: d.title, created_by: d.created_by, createdAt: d.createdAt }))
    }));

    const total = submissions.length;
    const totalAssigned = submissions.filter(s => s.status === 'assigned').length;
    const submittedCount = submissions.filter(s => ['submitted','approved'].includes(s.status)).length;
    const onTimeCount = submissions.filter(s => s.submittedAt && s.deadline && new Date(s.submittedAt) <= new Date(s.deadline)).length;
    const lateCount = submissions.filter(s => s.submittedAt && s.deadline && new Date(s.submittedAt) > new Date(s.deadline)).length;
    const pendingCount = submissions.filter(s => !s.submittedAt || ['assigned','returned','pending'].includes(s.status)).length;

    // --- Assigned bins where the faculty is included but may not have submitted yet ---
    // Compute per-bin aggregates (submissionsCount, submittedCount, onTimeCount, lateCount, pendingCount, completionPercent)
    // and include the faculty's own submission status if present.
    const assignedAgg = [
      { $match: { status: { $ne: 'archived' }, faculty_ids: userObjId } },
      { $project: {
        id: '$_id',
        title: '$title',
        department: '$department',
        school: '$school',
        deadline: '$deadline',
        createdAt: '$createdAt',
        submissionsCount: { $size: { $ifNull: ['$submissions', []] } },
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
        // compute completionPercent similar to department logic
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
        },
        // get this faculty's submission (if any)
        userSubmission: {
          $let: {
            vars: {
              found: { $filter: { input: { $ifNull: ['$submissions', []] }, as: 's', cond: { $eq: ['$$s.faculty', userObjId] } } }
            },
            in: { $arrayElemAt: ['$$found', 0] }
          }
        }
      } },
      { $sort: { createdAt: -1 } },
      { $limit: 200 }
    ];

    const assignedRaw = await SubmissionBin.aggregate(assignedAgg).allowDiskUse(true);

    const assignedBins = (assignedRaw || []).map((b) => ({
      id: b.id,
      title: b.title,
      department: b.department,
      school: b.school,
      deadline: b.deadline || null,
      submissionsCount: b.submissionsCount || 0,
      submittedCount: b.submittedCount || 0,
      onTimeCount: b.onTimeCount || 0,
      lateCount: b.lateCount || 0,
      pendingCount: b.pendingCount || 0,
      completion: b.completionPercent || '—',
      userSubmission: b.userSubmission ? { id: b.userSubmission._id, status: b.userSubmission.status, submittedAt: b.userSubmission.submitted_at } : null
    }));
    // --- Deadline categorization for assigned bins (date-only, ±5 days) ---
    const now = new Date();
    const msDay = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTodayDate = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate()).getTime();
    const plus5Date = new Date(startOfToday.getTime() + 5 * msDay).getTime();
    const minus5Date = new Date(startOfToday.getTime() - 5 * msDay).getTime();

    const isCompletedAssignedBin = (b) => {
      if (b == null) return false;
      if (typeof b.is_completed === 'boolean') return b.is_completed === true;
      if (b.userSubmission && typeof b.userSubmission.status === 'string' && b.userSubmission.status.toLowerCase() === 'completed') return true;
      if (typeof b.status === 'string' && b.status.toLowerCase() === 'completed') return true;
      return false;
    };

    const upcomingAssigned = [];
    const dueTodayAssigned = [];
    const overdueAssigned = [];

    assignedBins.forEach((b) => {
      if (!b) return;
      const raw = b.deadline || b.createdAt || null;
      if (!raw) return;
      if (isCompletedAssignedBin(b)) return;

      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      // dueToday: same calendar date as today
      if (dDate === startOfTodayDate) {

        if (d.getTime() < now.getTime()) {
          overdueAssigned.push(b);
          return;
        }
        dueTodayAssigned.push(b);
        return;
      }

      // upcoming: date after today up to +5 days
      if (dDate > startOfTodayDate && dDate <= plus5Date) {
        upcomingAssigned.push(b);
        return;
      }

      // overdue: date before today but not older than 5 days
      if (dDate < startOfTodayDate && dDate >= minus5Date) {
        overdueAssigned.push(b);
        return;
      }
    });

    const sortByDeadlineAsc = (arr) => arr.sort((x, y) => new Date(x.deadline || x.createdAt) - new Date(y.deadline || y.createdAt));
    sortByDeadlineAsc(upcomingAssigned);
    sortByDeadlineAsc(dueTodayAssigned);
    sortByDeadlineAsc(overdueAssigned);

    console.log('dashboardFaculty deadlines', { upcomingAssigned: upcomingAssigned.length, dueTodayAssigned: dueTodayAssigned.length, overdueAssigned: overdueAssigned.length });

    return res.json({
      success: true,
      total,
      totalAssigned,
      submittedCount,
      onTimeCount,
      lateCount,
      pendingCount,
      submissions,
      assignedBins,
      upcomingAssigned,
      dueTodayAssigned,
      overdueAssigned
    });
  } catch (err) {
    console.error('dashboardFaculty error', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}
