import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, Mail, Scale, ShieldAlert, Upload } from 'lucide-react'

import { COPYRIGHT_CONTACT_EMAIL, isCopyrightEnabled } from '@/lib/copyright'
import { bibHref } from '@/lib/biblioteca-path'

export const metadata = {
  title: 'Política de derechos · Biblioteca Digital',
}

export default function LegalPage() {
  if (!isCopyrightEnabled()) {
    redirect(bibHref('/biblioteca'))
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={bibHref('/biblioteca')}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Volver al catálogo
      </Link>

      <header className="mt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Biblioteca Digital</p>
        <h1 className="font-serif text-2xl font-bold text-navy sm:text-3xl">
          Política de derechos de autor
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          IES N° 9018 · Centro de Estudiantes &quot;Unidos por el IES&quot;
        </p>
      </header>

      <div className="prose prose-sm mt-8 max-w-none space-y-8 text-navy prose-headings:font-serif prose-headings:text-navy prose-p:text-muted-foreground prose-li:text-muted-foreground">
        <section>
          <div className="mb-3 flex items-center gap-2 text-navy">
            <Scale className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="m-0 font-serif text-lg font-semibold">Marco institucional</h2>
          </div>
          <p>
            La Biblioteca Digital es un servicio del Centro de Estudiantes destinado a facilitar
            el acceso a material de estudio para la comunidad educativa. Respetamos la propiedad
            intelectual y la legislación argentina de derechos de autor (Ley 11.723 y normativa
            complementaria).
          </p>
          <p>
            No somos una plataforma de distribución comercial ni un repositorio de obras piratas.
            Todo material publicado debe poder compartirse de forma legítima.
          </p>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-navy">
            <Upload className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="m-0 font-serif text-lg font-semibold">Qué se puede subir</h2>
          </div>
          <ul>
            <li>Apuntes, resúmenes y trabajos propios o con autorización expresa del autor.</li>
            <li>Material docente compartido explícitamente para la cursada (slides, guías, consignas).</li>
            <li>Obras en dominio público.</li>
            <li>Material con licencia abierta que permita redistribución (Creative Commons, etc.).</li>
          </ul>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-navy">
            <ShieldAlert className="h-5 w-5 text-destructive" aria-hidden />
            <h2 className="m-0 font-serif text-lg font-semibold">Qué no se permite</h2>
          </div>
          <ul>
            <li>Libros, manuales u obras comerciales completas sin autorización del titular.</li>
            <li>Material escaneado o fotocopiado de editoriales sin permiso.</li>
            <li>Contenido subido sabiendo que infringe derechos de terceros.</li>
            <li>Cualquier material que el uploader no tenga derecho a redistribuir.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold text-navy">Declaración al subir</h2>
          <p>
            Quien sube material debe seleccionar el tipo de contenido y aceptar una declaración
            afirmando que tiene derecho a compartirlo. Registramos la fecha y el usuario que
            realizó esa declaración. Subir material sin derecho puede derivar en la suspensión
            de la cuenta y la eliminación del contenido.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold text-navy">Reclamos y retiro de material</h2>
          <p>
            Si sos titular de derechos de autor o representante autorizado y considerás que un
            material infringe tus derechos, podés presentar un reclamo desde la página de lectura
            del material o escribirnos directamente. Al recibir un reclamo fundado:
          </p>
          <ol>
            <li>El material se pone en revisión (cuarentena) de inmediato.</li>
            <li>Un moderador del Centro evalúa el caso.</li>
            <li>Si el reclamo procede, el material se retira de la biblioteca.</li>
          </ol>
          <p>
            Nos comprometemos a responder en un plazo razonable. Para reclamos por email,
            incluí el enlace al material, una descripción del motivo y un medio de contacto.
          </p>
          <a
            href={`mailto:${COPYRIGHT_CONTACT_EMAIL}?subject=Reclamo%20de%20derechos%20de%20autor%20-%20Biblioteca%20Digital`}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-navy no-underline transition-colors hover:border-primary/40"
          >
            <Mail className="h-4 w-4 text-primary" aria-hidden />
            {COPYRIGHT_CONTACT_EMAIL}
          </a>
        </section>

        <section>
          <h2 className="font-serif text-lg font-semibold text-navy">Uso del material</h2>
          <p>
            El acceso a la biblioteca no transfiere derechos sobre las obras. Los usuarios deben
            respetar la autoría y las licencias aplicables. Las citas deben seguir las normas
            académicas (APA u otras) y reconocer a los autores originales.
          </p>
        </section>

        <p className="rounded-xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
          Esta política puede actualizarse. Última revisión: junio 2026. Ante dudas, contactá al
          Centro de Estudiantes del IES N° 9018.
        </p>
      </div>
    </div>
  )
}
