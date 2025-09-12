-- Create triggers to automatically update project dates when assignments change
-- This ensures project timeline always spans from earliest assignment start to latest assignment end

-- Trigger for INSERT operations on project_assignees
CREATE OR REPLACE TRIGGER trigger_update_project_timeline_on_assignment_insert
    AFTER INSERT ON project_assignees
    FOR EACH ROW
    EXECUTE FUNCTION update_project_timeline_from_assignments();

-- Trigger for UPDATE operations on project_assignees  
CREATE OR REPLACE TRIGGER trigger_update_project_timeline_on_assignment_update
    AFTER UPDATE ON project_assignees
    FOR EACH ROW
    EXECUTE FUNCTION update_project_timeline_from_assignments();

-- Trigger for DELETE operations on project_assignees
CREATE OR REPLACE TRIGGER trigger_update_project_timeline_on_assignment_delete
    AFTER DELETE ON project_assignees
    FOR EACH ROW
    EXECUTE FUNCTION update_project_timeline_from_assignments();