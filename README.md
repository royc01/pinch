## Pinch 

**Pinch** is a habit tracking and task management plugin deeply integrated with SiYuan Note. Following the design philosophy of "ultimate lightweight", it enables you to complete habit tracking, task management, focus timing, mood recording, and a series of productivity operations without leaving SiYuan Note.

## Core Philosophy

- **Seamless Integration**: No need to change your workflow, built on the SiYuan Note ecosystem
- **Always at Hand**: Open with one click in the sidebar, no need to switch apps
- **Respect Fragmented Time**: Every small persistence is worth recording
- **Trust in Compound Interest**: The accumulation of fragmented time can create amazing results

## Main Features

| Module | Description |
| ---------- | ------------------------------ |
| Habit Tracker | Create habits, daily check-in, statistics & trends |
| Task Management | Auto-collect document tasks, multi-view management |
| Pomodoro Timer | Focus timing, white noise, floating capsule window |
| Mood Check-in | Daily mood recording, trend charts |
| Goal System | Goal setting, progress tracking, overdue reminders |
| Reward System | Earn rewards from check-ins/tasks, redemption store |
| Statistics & Review | Multi-dimensional behavior data analysis |

<div style="display: flex; gap: 20px; align-items: center; justify-content: flex-start; margin: 1.5em 0;">
  <!-- Button 1: Blue -->
  <a href="https://ld246.com/article/1778053942822" 
      style="display: inline-flex; 
              align-items: center; 
              padding: 10px 20px; 
              background: #2d8cf0; 
              color: white; 
              border-radius: 6px; 
              text-decoration: none;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              transform: translateY(0);
              box-shadow: 0 4px 6px rgba(45,140,240,0.1);
              border: 1px solid rgba(45,140,240,0.2);">
      📖 User Guide
  </a>
  <!-- Button 2: Green -->
  <a href="https://qm.qq.com/q/BpFzB93TLG" 
      style="display: inline-flex; 
              align-items: center; 
              padding: 10px 20px; 
              background: #19be6b; 
              color: white; 
              border-radius: 6px; 
              text-decoration: none;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              transform: translateY(0);
              box-shadow: 0 4px 6px rgba(25,190,107,0.1);
              border: 1px solid rgba(25,190,107,0.2);">
      💬 Join QQ Group
  </a>
  <!-- Button 3: Orange/Amber -->
  <a href="https://github.com/royc01/pinch/issues" 
      style="display: inline-flex; 
              align-items: center; 
              padding: 10px 20px; 
              background: #ff9900; 
              color: white; 
              border-radius: 6px; 
              text-decoration: none;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              transform: translateY(0);
              box-shadow: 0 4px 6px rgba(255,153,0,0.1);
              border: 1px solid rgba(255,153,0,0.2);">
      💌 Feedback
  </a>
</div>

## v2.3.1

* [Fixed] Performance issues in certain cases
* [Fixed] Occasional errors when switching views
* [Fixed] Occasional bugs when editing and updating task descriptions
* [Fixed] Incorrect task document retrieval in Goal Management
* [Fixed] Incorrect dropdown popover positioning for in-view tabs
* [Fixed] Incorrect document tags when selecting goals as the Gantt chart source
* [Fixed] Incorrect Gantt chart range retrieval
* [Fixed] Frozen header row displacement when scrolling the Gantt chart
* [Fixed] Mini Tomato auto check-in not taking effect after countdown completion
* [Fixed] Page reload caused by focus ending in certain cases
* [Optimized] Redesigned interface UI
* [Optimized] Redesigned prompt system with richer operation guidance
* [Optimized] Updated Pinch color system
* [Optimized] Redesigned sidebar popup mechanism
* [Optimized] Redesigned mood statistics page
* [Optimized] Gantt chart unscheduled task button now applies to all groups
* [Optimized] Added virtual rendering to the Gantt chart
* [Optimized] Added refresh buttons for document groups and Goal Management
* [Optimized] Starting a countdown after setting a habit check-in Pomodoro no longer jumps to the focus panel
* [Optimized] Habit focus countdown is mutually exclusive with the focus panel and focus capsule
* [Optimized] Mini Tomato creation mechanism
* [Optimized] Renamed Gantt chart button text to Goal
* [Optimized] Adjusted calendar view switching by moving date range switching into the view
* [Optimized] Calendar view all-day area no longer has a height limit
* [Optimized] Unscheduled task expand/collapse mechanism in Goal View
* [Optimized] Improved Goal View smoothness
* [New] Tags expanded into a multi-tag system; grouping uses the primary tag as the category, while additional tags only participate in filtering
* [New] Bulk editing supports multiple tags
* [New] Support for backfilling focus duration from the calendar in the focus page
* [New] Support for clearing focus duration from the log page
* [New] Habit shortcut button for jumping to focus
* [New] Habit notes can be filled in by focus time group
* [New] Calendar view displays focus time records
* [New] Focus time records in calendar view support right-click note editing
* [New] Calendar view displays operation log records
* [New] Calendar view log side timeline
* [New] Mood records are now daily records, with support for multiple entries per day
* [New] Custom cycle patterns can be created for habits
* [New] Habit custom cycle patterns can be displayed in calendar view
* [New] Habit block colors in calendar view are automatically assigned based on emoji
* [New] Individual tasks can be assigned to goal groups, no longer limited to document level
* [New] Task quick edit menu, triggered by typing @ in task blocks inside documents
* [New] Dragging sidebar tasks into Goal View directly adds them to groups
* [New] Task deadline badges changed to N days left / N days overdue
* [New] Goal progress bars in Goal View can adjust goal deadlines
* [New] Clicking view tab filters displays tasks from descendant documents within the view
* [New] Clicking modules in Goal View and Calendar View opens the sidebar editor

## v2.3.0

* [Optimized] Recurring tasks default to "in progress" status
* [Optimized] Improved date group sorting
* [Optimized] Improved plugin stability
* [Optimized] Improved plugin loading speed
* [Optimized] Table view cell width stability
* [Optimized] Independent filter data handling for Kanban and Card views
* [Optimized] Merged count-up timer into focus duration setting
* [Optimized] Sidebar document filter hides documents with all tasks archived
* [Optimized] Stuck tasks module filtering by start date
* [Optimized] Improved Mini Tomato toggle stability
* [Optimized] One-click date recognition can overwrite existing recognition
* [Optimized] Moved sidebar settings button to the top, improved settings categorization
* [Fixed] Sidebar focus and focus capsule mutual exclusion bug
* [Fixed] Recurring task display issue in sidebar
* [Fixed] Cross-day task display bug in calendar view
* [Fixed] Task drag display bug in calendar view
* [Fixed] Recurring task link to document not working
* [Fixed] Inconsistent sorting in table view
* [New] Custom recurrence mechanism for recurring tasks
* [New] Recurring tasks can be modified in the task editing dialog
* [New] Kanban, Card, and Table views now display recurring tasks
* [New] Added time-spent column in table view, showing Pomodoro count
* [New] Added completion time column in table view
* [New] Added column show/hide settings panel for table view
* [New] Extended single-day time semantic recognition to time ranges
* [New] Extended task time semantic recognition granularity to specific time points
* [New] Custom keywords for task time semantic recognition
* [New] Dragging tasks to calendar view automatically assigns colors based on tags
* [New] Count-up timer saves timing data every minute
* [New] Habit log displays habit name and daily focus duration
* [New] Option to continue with Mini Tomato when exiting sidebar Pomodoro
* [New] UI settings for view show/hide and sidebar module ordering
* [New] Default path setting for new tasks
* [New] Goal Gantt view
    * Can be dragged from sidebar panel to the view
    * Can drag tasks from the view's task list to date columns for scheduling
    * When source is set to "All", grouping follows goals (recommended to avoid other filters for proper goal management)
    * Goal and document groups can be collapsed/expanded
    * Goal groups show time span, progress, and deadline line
    * Some interactions are consistent with calendar view
* [New] Set minimum N check-ins for habits, e.g., drink 8 glasses of water today, can continue accumulating after reaching the goal
* [New] Internationalization (i18n) support
