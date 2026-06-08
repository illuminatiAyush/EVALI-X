-- 013_batch_notices.sql
-- Create batch_notices table for persistent history of class announcements

CREATE TABLE IF NOT EXISTS public.batch_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_notices_batch ON public.batch_notices(batch_id);

-- Enable RLS
ALTER TABLE public.batch_notices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Teachers manage notices in own batches" ON public.batch_notices;
CREATE POLICY "Teachers manage notices in own batches" ON public.batch_notices
  USING (EXISTS (
    SELECT 1 FROM public.batches 
    WHERE id = batch_id AND created_by = auth.uid()
  ));

DROP POLICY IF EXISTS "Students view notices in enrolled batches" ON public.batch_notices;
CREATE POLICY "Students view notices in enrolled batches" ON public.batch_notices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.student_batches 
    WHERE batch_id = public.batch_notices.batch_id AND student_id = auth.uid()
  ));

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'batch_notices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_notices;
  END IF;
END $$;

-- Trigger: Auto-Notification on Notice Insertion
CREATE OR REPLACE FUNCTION public.notify_students_on_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_name TEXT;
  v_teacher_name TEXT;
BEGIN
  -- Get batch details
  SELECT name INTO v_batch_name FROM public.batches WHERE id = NEW.batch_id;
  -- Get teacher details
  SELECT name INTO v_teacher_name FROM public.profiles WHERE id = NEW.created_by;

  -- Insert notifications for all students enrolled in this batch
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT 
    sb.student_id, 
    'New Notice in ' || COALESCE(v_batch_name, 'Class'), 
    COALESCE(v_teacher_name, 'Instructor') || ' posted: ' || NEW.title, 
    'notice', 
    json_build_object('batch_id', NEW.batch_id, 'notice_id', NEW.id)
  FROM public.student_batches sb
  WHERE sb.batch_id = NEW.batch_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_students_on_notice ON public.batch_notices;
CREATE TRIGGER trigger_notify_students_on_notice
AFTER INSERT ON public.batch_notices
FOR EACH ROW
EXECUTE FUNCTION public.notify_students_on_notice();
