## Pinch 

**Pinch ** is a habit tracking and task management plugin deeply integrated with SiYuan Note. Following the design philosophy of "ultimate lightweight", it enables you to complete habit tracking, task management, focus timing, mood recording, and a series of productivity operations without leaving SiYuan Note.

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